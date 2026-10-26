"""Check original floor detail and the joins around cleared cabinet positions.

Expected pixels come from the approved clean PNG, independently of the runtime
floor snapshot. Disposable browsers block external services and use no accounts.
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

    def test_undamaged_floor_retains_its_original_grout_lighting_and_texture(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        self.freeze_scene()
        # Cover the arcade's north, centre, east, south and both sides of the
        # counter. Include grout and tile interiors rather than imposing a new
        # 12px phase on artwork whose tile intervals naturally vary by a pixel.
        anchors = [[700,408], [730,450], [970,430], [1110,430],
                   [1200,320], [1310,340], [1540,400], [880,500],
                   [1000,500], [1100,600], [900,680], [1200,680],
                   [1400,700], [1550,750], [1100,780], [1294,750],
                   [1360,600], [1320,320], [1540,600], [1087,606]]
        points = [[x+dx,y+dy] for x,y in anchors
                  for dx,dy in ((0,0),(1,0),(-1,0),(0,1),(0,-1))]
        visible = self.page.evaluate('''points=>{
          const characters=CodaArcadeQA.characters(),actors=[characters.player,
            ...characters.npcs.filter(actor=>!actor.hidden)];
          return points.map(([x,y])=>!actors.some(actor=>
            Math.abs(actor.x-x)<45&&y>actor.y-100&&y<actor.y+14));
        }''', points)
        actual, expected = self.rendered(points), self.original(points)
        compared = 0
        for point, clear, observed, original in zip(points, visible, actual, expected):
            if not clear:
                continue
            with self.subTest(point=point):
                self.assertEqual(observed, original,
                                 'Unoccupied floor must keep its original pixels; no blur or replacement grid')
                compared += 1
        self.assertGreaterEqual(compared, 80, 'Inspect floor across the room, not character pixels')

    def test_cleared_cabinet_grout_joins_the_adjacent_source_floor(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        self.freeze_scene()
        checks = self.page.evaluate('''async()=>{
          const image=new Image();image.src='coda_arcade_world_clean.png';await image.decode();
          const reference=document.createElement('canvas');reference.width=1672;reference.height=941;
          const original=reference.getContext('2d');original.drawImage(image,0,0);
          const surface=document.querySelector('#view').getContext('2d'),camera=CodaArcadeQA.camera(),
            characters=CodaArcadeQA.characters(),actors=[characters.player,
              ...characters.npcs.filter(actor=>!actor.hidden)];
          const profile=(context,x,y,rendered)=>{
            const values=[];
            for(let yy=y-5;yy<=y+5;yy++){
              let sum=0;
              for(let xx=x;xx<x+3;xx++){
                const px=rendered?Math.floor((xx-camera.x)*camera.zoom):xx,
                  py=rendered?Math.floor((yy-camera.y)*camera.zoom):yy,
                  pixel=context.getImageData(px,py,1,1).data;
                sum+=pixel[1]*.7+pixel[2]*.3;
              }
              values.push(sum/3);
            }
            const candidates=[];
            for(let i=2;i<values.length-2;i++)candidates.push({
              y:y-5+i,contrast:values[i]-(values[i-2]+values[i+2])/2});
            candidates.sort((a,b)=>b.contrast-a.contrast);
            return {...candidates[0],detail:values};
          };
          return [
            {name:'Pitch Race',left:682,right:777}, {name:'Music Triad',left:791,right:895},
            {name:'Rhythm Room',left:912,right:1016}, {name:'Song Machine',left:1028,right:1135}
          ].flatMap(cabinet=>[262,273,284,296,310,323,336,349,362].map(y=>{
            const clear=edge=>!actors.some(actor=>
              Math.abs(actor.x-edge)<50&&y>actor.y-105&&y<actor.y+19),
              useRight=clear(cabinet.right),edge=useRight?cabinet.right:cabinet.left,
              inner=useRight?edge-7:edge+4,outer=useRight?edge+3:edge-6;
            return {name:cabinet.name,row:y,
              source:profile(original,outer,y,false),
              originalInside:y>=310?profile(original,inner,y,false):null,
              occupied:!clear(edge),
              inside:profile(surface,inner,y,true),outside:profile(surface,outer,y,true)};
          }));
        }''')
        compared = 0
        for check in checks:
            # Reflections occasionally obscure a source line. Verify the clear
            # witnesses independently of the repair's own row list or snapshot.
            expected = check['originalInside'] or check['source']
            if check['occupied'] or check['source']['contrast'] < 6 or expected['contrast'] < 6:
                continue
            with self.subTest(cabinet=check['name'], row=check['row']):
                self.assertEqual(check['outside']['y'], check['source']['y'],
                                 'Repair must leave the adjacent original floor untouched')
                if check['originalInside'] is None:
                    self.assertLessEqual(abs(check['inside']['y']-expected['y']), 1,
                                         'Newly exposed cabinet floor must join the adjacent grout')
                else:
                    # Colored reflections can change which of two neighboring
                    # highlights is brightest. Compare the complete fine-line
                    # profile, not that brightness ranking, to detect a shift.
                    def detail(values):
                        return [values[i]-(values[i-2]+values[i+2])/2
                                for i in range(2,len(values)-2)]
                    original_detail = detail(expected['detail'])
                    rendered_detail = detail(check['inside']['detail'])
                    scores = []
                    for shift in range(-2,3):
                        pairs = [(value,rendered_detail[index+shift])
                                 for index,value in enumerate(original_detail)
                                 if 0 <= index+shift < len(rendered_detail)]
                        mean_a = sum(a for a,b in pairs)/len(pairs)
                        mean_b = sum(b for a,b in pairs)/len(pairs)
                        numerator = sum((a-mean_a)*(b-mean_b) for a,b in pairs)
                        denominator = (sum((a-mean_a)**2 for a,b in pairs)*
                                       sum((b-mean_b)**2 for a,b in pairs))**.5
                        scores.append((numerator/denominator if denominator else -1,shift))
                    correlation,shift = max(scores)
                    self.assertLessEqual(abs(shift), 1,
                                         'The existing reflection-floor detail must not shift')
                    self.assertGreater(correlation, .8,
                                       'Reflection cleanup must keep the source grout pattern')
                self.assertGreater(check['inside']['contrast'], 4,
                                   'The exposed cabinet floor must retain visible tile lines')
                compared += 1
        self.assertGreaterEqual(compared, 28, 'Check clear joins beneath every cabinet')

    def test_phone_zoom_keeps_the_original_grout_pixels_sharp(self):
        self.load()
        self.page.wait_for_function('CodaArcadeQA.floorGrid()?.ready')
        self.freeze_scene()
        # Use original grout coordinates and exclude frozen actor silhouettes.
        # Expected colors still come solely from the PNG, never the renderer.
        x,y = self.page.evaluate("""()=>{
          const characters=CodaArcadeQA.characters(),actors=[characters.player,
            ...characters.npcs.filter(actor=>!actor.hidden)];
          for(const y of [606,571,523,437])for(const x of [1087,1063,1038,1110,1003,957])
            if(!actors.some(actor=>Math.abs(actor.x-x)<50&&y>actor.y-105&&y<actor.y+19))
              return [x,y];
          throw Error('No clear source grout witness');
        }""")
        source_pixels = self.original([[x+dx,y] for dx in (-1,0,1,2)])
        expected_strip = [pixel for pixel in source_pixels for _ in range(2)]
        for size in ({'width':390,'height':844}, {'width':844,'height':390}):
            with self.subTest(viewport=size):
                self.page.set_viewport_size(size)
                self.page.evaluate('CodaAssetStudioQA.close()')
                self.assertTrue(self.page.evaluate(
                    '([x,y])=>CodaArcadeQA.place(x+40,y-30)', [x,y]))
                self.page.evaluate('CodaArcadeQA.setZoom(2)')
                self.page.wait_for_function("""([x,y])=>{
                  const camera=CodaArcadeQA.camera(),v=camera.viewport,
                    px=(x-camera.x)*camera.zoom,py=(y-camera.y)*camera.zoom;
                  return camera.zoom===2&&px>v.left+10&&px<v.left+v.width-10&&
                    py>v.top+10&&py<v.top+v.height-10;
                }""", arg=[x,y])
                self.freeze_scene()
                result = self.page.evaluate('''([x,y])=>{
                  const camera=CodaArcadeQA.camera(),canvas=document.querySelector('#view'),
                    context=canvas.getContext('2d'),px=Math.round((x-camera.x)*camera.zoom),
                    py=Math.round((y-camera.y)*camera.zoom),strip=context.getImageData(px-2,py,8,1).data;
                  return {smooth:context.imageSmoothingEnabled,style:getComputedStyle(canvas).imageRendering,
                    strip:Array.from({length:8},(_,i)=>Array.from(strip.slice(i*4,i*4+4)))};
                }''', [x,y])
                self.assertFalse(result['smooth'])
                self.assertEqual(result['style'], 'pixelated')
                self.assertEqual(result['strip'], expected_strip,
                                 'At 2× zoom every original grout pixel must occupy two sharp pixels')



if __name__ == '__main__':
    unittest.main(verbosity=2)
