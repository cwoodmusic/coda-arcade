"""Exercise the published furniture footprints and counter decals as a guest.

Disposable local browser, synthetic avatar, and blocked external services only.
The draw probe is injected into the fixture; production exposes no extra hooks.
"""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    'furniture_owner_fixture', Path(__file__).with_name('developer-owner-world-browser.py'))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)

DRAW_PROBE = r'''
window.__furnitureDrawProbe=id=>{
 const previous=g,oldCamera={...cam};
 const make=()=>{const surface=document.createElement('canvas');surface.width=W;surface.height=H;return surface;};
 const actor=make(),prop=make(),scene=make();
 try{
  cam.x=0;cam.y=0;cam.zoom=1;g=scene.getContext('2d');draw();
  g=actor.getContext('2d');g.imageSmoothingEnabled=false;
  characterRenderer.drawPlayer(g,avatar,{x:player.x,y:player.y,facing,walking,phase:playerPhase,jumpHeight},clock);
  const asset=assetStudio.assets.find(a=>a.id===id);
  g=prop.getContext('2d');g.imageSmoothingEnabled=false;drawPlacedAsset(asset);
  const a=actor.getContext('2d').getImageData(0,0,W,H).data,
   p=prop.getContext('2d').getImageData(0,0,W,H).data,
   s=scene.getContext('2d').getImageData(0,0,W,H).data;
  let overlap=0,actorWins=0,propWins=0;
  for(let at=0;at<a.length;at+=4){
   if(a[at+3]<250||p[at+3]<250||[0,1,2].every(c=>a[at+c]===p[at+c]))continue;
   overlap++;
   if([0,1,2].every(c=>Math.abs(s[at+c]-a[at+c])<=2))actorWins++;
   if([0,1,2].every(c=>Math.abs(s[at+c]-p[at+c])<=2))propWins++;
  }
  return {overlap,actorWins,propWins,player:{...player}};
 }finally{g=previous;Object.assign(cam,oldCamera);}
};
'''


class PublishedFurnitureCollisionTests(unittest.TestCase):
    setUpClass = classmethod(fixture.DeveloperOwnerWorldTests.setUpClass.__func__)
    tearDownClass = classmethod(fixture.DeveloperOwnerWorldTests.tearDownClass.__func__)
    tearDown = fixture.DeveloperOwnerWorldTests.tearDown
    route = fixture.DeveloperOwnerWorldTests.route
    load = fixture.DeveloperOwnerWorldTests.load
    role = fixture.DeveloperOwnerWorldTests.role

    def setUp(self):
        fixture.DeveloperOwnerWorldTests.setUp(self)
        self.expected = json.loads((ROOT / 'published-world-project.json').read_text())
        self.context.add_init_script("localStorage.setItem('musicArcadeV1',JSON.stringify({name:'Fixture',headwear:'wizard',customized:true}))")
        html = (ROOT / 'world-preview.html').read_text()
        marker = 'window.CodaArcadeQA=Object.freeze({'
        self.assertEqual(html.count(marker), 1)
        self.context.route('**/world-preview.html*', lambda route: route.fulfill(
            status=200, content_type='text/html', body=html.replace(marker, DRAW_PROBE + marker, 1)))
        self.load('guest')
        self.page.wait_for_function('CodaArcadeQA.environment().ready')

    def walk(self, x, y, key):
        self.assertTrue(self.page.evaluate('([x,y])=>CodaArcadeQA.place(x,y)', [x, y]))
        self.page.locator('#view').focus()
        self.page.keyboard.down(key)
        self.page.wait_for_timeout(450)
        self.page.keyboard.up(key)
        return self.page.evaluate('CodaArcadeQA.position()')

    def test_counter_art_stays_on_counter_behind_the_player(self):
        for asset_id, x in [('asset-40', 1352), ('asset-41', 1268), ('asset-42', 1436)]:
            with self.subTest(asset=asset_id):
                self.assertTrue(self.page.evaluate('x=>CodaArcadeQA.place(x,600)', x))
                probe = self.page.evaluate('__furnitureDrawProbe', asset_id)
                self.assertGreater(probe['overlap'], 10, probe)
                self.assertGreaterEqual(probe['actorWins'], probe['overlap'] * .95, probe)
                self.assertEqual(probe['propWins'], 0, probe)
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProject()'), self.expected)

    def test_table_and_both_couches_stop_keyboard_walking_at_their_bases(self):
        cases = [
            ('navy couch', 180, 690, 'a', 'x', 150, 180),
            ('coral couch', 170, 265, 'a', 'x', 140, 170),
            ('left table leg', 225, 245, 'd', 'x', 225, 250),
            ('right table leg', 435, 245, 'a', 'x', 410, 435),
        ]
        for label, x, y, key, axis, low, high in cases:
            with self.subTest(furniture=label):
                after = self.walk(x, y, key)
                self.assertGreaterEqual(after[axis], low, after)
                self.assertLess(after[axis], high, after)
        for point in [[112, 690], [104, 265], [255, 245], [405, 245]]:
            self.assertFalse(self.page.evaluate('([x,y])=>CodaArcadeQA.walkable(x,y)', point), point)

    def test_adjacent_walkways_and_published_edits_survive_reload(self):
        for point in [[165, 690], [165, 265], [112, 750], [104, 290], [328, 275], [435, 245], [1352, 600]]:
            self.assertTrue(self.page.evaluate('([x,y])=>CodaArcadeQA.walkable(x,y)', point), point)
        self.assertGreater(len(self.page.evaluate('CodaArcadeQA.route(180,750,180,640)')), 0)
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole.ready()')
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProjectSource()'), 'published')
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProject()'), self.expected)
        self.assertIsNone(self.page.evaluate("localStorage.getItem('codaWorldProjectV1')"))


if __name__ == '__main__':
    unittest.main(verbosity=2)
