"""Rendered main-floor grid and preserved artwork in disposable world sessions.

Uses the production floor renderer, published world, and FX-off canvas pixels.
External services are blocked; no classroom data or existing saves are used.
"""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location(
    'arcade_floor_world_fixture', Path(__file__).with_name('published-world-browser.py'))
fixture = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fixture)


class ArcadeFloorGridTests(unittest.TestCase):
    setUpClass = classmethod(fixture.PublishedWorldTests.setUpClass.__func__)
    tearDownClass = classmethod(fixture.PublishedWorldTests.tearDownClass.__func__)
    setUp = fixture.PublishedWorldTests.setUp
    tearDown = fixture.PublishedWorldTests.tearDown
    load = fixture.PublishedWorldTests.load

    def rendered(self, points):
        return self.page.evaluate('''points=>{
          const surface=document.querySelector('#view').getContext('2d'),camera=CodaArcadeQA.camera();
          return points.map(([x,y])=>Array.from(surface.getImageData(
            Math.floor((x-camera.x)*camera.zoom),Math.floor((y-camera.y)*camera.zoom),1,1).data));
        }''', points)

    def original(self, points):
        return self.page.evaluate('''async points=>{
          const image=new Image();image.src='coda_arcade_world_clean.png';await image.decode();
          const reference=document.createElement('canvas');reference.width=1672;reference.height=941;
          const context=reference.getContext('2d');context.drawImage(image,0,0);
          return points.map(([x,y])=>Array.from(context.getImageData(x,y,1,1).data));
        }''', points)

    def freeze_scene(self):
        # The layer pane pauses actors and suppresses interaction prompts. Its
        # diagnostic colors are separate from the scene and must be hidden.
        self.page.evaluate("CodaDeveloperConsole.open('layers')")
        for selector in ('#devShowCollision', '#devShowLayers'):
            if self.page.locator(selector).get_attribute('aria-pressed') == 'true':
                self.page.locator(selector).click()
        self.page.mouse.move(1500, 900)
        self.page.evaluate('publishFrames(3)')

    def test_floor_repair_preserves_fixture_art_and_the_other_rooms(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        self.freeze_scene()
        points = [[1460,205], [1285,44], [1188,171], [1473,788],
                  [286,63], [420,280], [457,733], [533,351],
                  [665,450], [681,450], [853,600], [853,700]]
        actual, expected = self.rendered(points), self.original(points)
        for point, observed, original in zip(points, actual, expected):
            with self.subTest(point=point):
                self.assertEqual(observed, original,
                                 'Repairing blue floor must preserve fixtures and other rooms')
        self.assertEqual(self.page.evaluate('''points=>points.map(([x,y])=>
          CodaArcadeQA.floorGrid().maskAt(x,y))''', points), [0] * len(points))

    def test_one_grid_phase_spans_vacated_cabinets_centre_and_south_floor(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        self.freeze_scene()
        anchors = [[720,288], [840,288], [936,288], [1080,288],
                   [960,384], [1104,408], [1440,360],
                   [960,624], [1080,648], [1200,672], [1344,696]]
        checks = self.page.evaluate('''anchors=>{
          const grid=CodaArcadeQA.floorGrid(),camera=CodaArcadeQA.camera(),
            surface=document.querySelector('#view').getContext('2d'),characters=CodaArcadeQA.characters(),
            actors=[characters.player,...characters.npcs.filter(actor=>!actor.hidden)];
          const pixel=(x,y)=>Array.from(surface.getImageData(
            Math.floor((x-camera.x)*camera.zoom),Math.floor((y-camera.y)*camera.zoom),1,1).data);
          return anchors.flatMap(([x,y])=>[
            {label:'major vertical',x,y:y+5,before:[x-2,y+5],after:[x+2,y+5]},
            {label:'minor vertical',x:x+12,y:y+5,before:[x+10,y+5],after:[x+14,y+5]},
            {label:'major horizontal',x:x+5,y,before:[x+5,y-2],after:[x+5,y+2]},
            {label:'minor horizontal',x:x+5,y:y+12,before:[x+5,y+10],after:[x+5,y+14]}
          ].map(point=>({...point,mask:grid.maskAt(point.x,point.y),
            occupied:actors.some(actor=>Math.abs(actor.x-point.x)<45&&point.y>actor.y-100&&point.y<actor.y+14),
            actual:pixel(point.x,point.y),expected:grid.pixelAt(point.x,point.y),
            before:pixel(...point.before),after:pixel(...point.after)})));
        }''', anchors)
        self.assertEqual(len(checks), 44)
        compared = 0
        for check in checks:
            if check['occupied']:
                continue
            with self.subTest(position=(check['x'], check['y']), line=check['label']):
                self.assertEqual(check['mask'], 255)
                self.assertEqual(check['actual'], check['expected'],
                                 'Cleanup or foreground passes must not repaint old grout')
                contrast = check['actual'][1] - (check['before'][1] + check['after'][1]) / 2
                self.assertGreater(contrast, 8,
                                   'Each visible grout line must land on the shared 12/24px phase')
                compared += 1
        self.assertGreaterEqual(compared, 36, 'Most witnesses must inspect visible floor rather than actors')

    def test_phone_zoom_keeps_grout_sharp_and_uses_the_same_world_pixels(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        for size in ({'width':390,'height':844}, {'width':844,'height':390}):
            with self.subTest(viewport=size):
                self.page.set_viewport_size(size)
                self.page.evaluate('CodaArcadeQA.setZoom(2)')
                self.page.wait_for_function('Math.abs(CodaArcadeQA.camera().zoom-2)<.001')
                self.page.evaluate('publishFrames(3)')
                result = self.page.evaluate('''()=>{
                  const grid=CodaArcadeQA.floorGrid(),camera=CodaArcadeQA.camera(),
                    canvas=document.querySelector('#view'),context=canvas.getContext('2d'),
                    x=1080,y=388,px=Math.round((x-camera.x)*camera.zoom),
                    py=Math.round((y-camera.y)*camera.zoom),strip=context.getImageData(px-3,py,8,1).data;
                  return {smooth:context.imageSmoothingEnabled,style:getComputedStyle(canvas).imageRendering,
                    expected:grid.pixelAt(x,y),strip:Array.from({length:8},(_,i)=>Array.from(strip.slice(i*4,i*4+4)))};
                }''')
                self.assertFalse(result['smooth'])
                self.assertEqual(result['style'], 'pixelated')
                matches = [index for index, pixel in enumerate(result['strip'])
                           if pixel == result['expected']]
                self.assertEqual(len(matches), 2,
                                 'At 2× zoom a one-pixel grout line must occupy two sharp pixels')
                self.assertEqual(matches[1], matches[0] + 1)


if __name__ == '__main__':
    unittest.main(verbosity=2)
