"""Published authored world: portable pixels, placements and save precedence."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('environment_world_fixture',
    Path(__file__).with_name('published-world-browser.py'))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)
FINGERPRINT = '4b4dc83862a3d2a3c9507c93b71d1c97256ffb5ce2574172340a5a0064601716'


class EnvironmentWorldTests(unittest.TestCase):
    setUpClass = classmethod(fixture.PublishedWorldTests.setUpClass.__func__)
    tearDownClass = classmethod(fixture.PublishedWorldTests.tearDownClass.__func__)
    tearDown = fixture.PublishedWorldTests.tearDown
    load = fixture.PublishedWorldTests.load
    project = fixture.PublishedWorldTests.project
    open_tab = fixture.PublishedWorldTests.open_tab
    field = fixture.PublishedWorldTests.field

    def setUp(self):
        fixture.PublishedWorldTests.setUp(self)
        self.current = json.loads((fixture.ROOT / 'published-world-project.json').read_text())
        self.context.route('**/published-world-project.json*', lambda route: route.fulfill(
            status=200, content_type='application/json', body=json.dumps(self.current)))

    def frames(self):
        self.page.evaluate('publishFrames(3)')

    def load_local_project(self, project):
        # The complete export exceeds localStorage's quota. Seed the same
        # IndexedDB store used by Save project rather than shrinking its data.
        self.load()
        self.page.evaluate('''project=>new Promise((resolve,reject)=>{
          const open=indexedDB.open('codaArcadeAssetStudioDB',1);
          open.onerror=()=>reject(open.error);
          open.onsuccess=()=>{
            const db=open.result,tx=db.transaction('layouts','readwrite');
            tx.objectStore('layouts').put({...project,savedAt:Date.now()},'codaWorldProjectV1');
            tx.oncomplete=()=>{db.close();resolve();};
            tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
          };
        })''', project)
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole.ready()&&CodaArcadeQA.characters().spriteState.ready')
        self.frames()

    def world_pixel(self, x, y):
        return self.page.evaluate('''([x,y])=>{
          const camera=CodaArcadeQA.camera();
          return Array.from(document.querySelector('#view').getContext('2d').getImageData(
            Math.floor((x-camera.x)*camera.zoom),Math.floor((y-camera.y)*camera.zoom),1,1).data);
        }''', [x,y])

    def background_pixel(self, x, y):
        return self.page.evaluate('''async([x,y])=>{
          const image=new Image();image.src='assets/environment/v1/empty-arcade.png';await image.decode();
          const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941;
          const g=canvas.getContext('2d');g.drawImage(image,0,0);
          return Array.from(g.getImageData(x,y,1,1).data);
        }''', [x,y])

    def authored_background(self):
        from PIL import Image
        image = Image.open(fixture.ROOT/'assets/environment/v1/empty-arcade.png').convert('RGBA')
        pixels = image.load()
        for tile, runs in self.current.get('artwork',{}).get('background.world',{}).get('tiles',{}).items():
            tx, ty = map(int, tile.split(','))
            for start, length, color in runs:
                rgba = tuple(bytes.fromhex(color[1:]))
                for index in range(start, start + length):
                    pixels[tx*64+index%64, ty*64+index//64] = rgba
        return image

    def test_reviewed_default_loads_authored_art_placements_and_all_cabinets(self):
        fingerprint=hashlib.sha256(json.dumps(self.current,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        self.assertEqual(fingerprint,FINGERPRINT)
        self.load();self.assertEqual(self.project(),self.current)
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getScenery()'),'environment-v1')
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProjectSource()'),'published')
        self.assertIsNone(self.page.evaluate('localStorage.getItem("codaWorldProjectV1")'))
        self.assertEqual((len(self.current['assets']),len(self.current['collision']),len(self.current['strokes'])),(59,2106,26))
        layers=self.page.evaluate('CodaArcadeQA.layerEditor()')
        self.assertEqual((layers['publishedStrokes'],layers['strokes']),(0,26))
        self.assertGreater(layers['paintPatches'],0)
        self.assertGreater(layers['editedPixels'],0)
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getCharacters()'),self.current['characters'])
        added=next(asset for asset in self.project()['assets'] if asset['id']=='asset-64')
        self.assertEqual((added['name'],added['x'],added['y'],added['flipX']),('Boombox tower',120,207,True))
        games=self.page.evaluate('''()=>CodaArcadeQA.worldObjects().filter(x=>x.game).map(x=>({
          name:x.game.name,walkable:CodaArcadeQA.walkable(x.game.npcX??x.game.x,x.game.npcY??x.game.y),
          route:CodaArcadeQA.route(1180,388,x.game.x,x.game.y).length}))''')
        self.assertEqual(len(games),4);self.assertTrue(all(game['walkable'] and game['route'] for game in games),games)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().spriteState.mode'),'javascript-characters')
        depths=self.page.evaluate('CodaArcadeQA.environment().foreground')
        walls=[part['depth'] for part in depths if part['type'] in ('wall','wall-mask')]
        front=[part for part in depths if part['name'].startswith(('dance_front_','obelisk_')) or part['name']=='dance_far_right_palm']
        self.assertEqual({part['name'] for part in front},{
            'dance_front_left_palm','dance_front_mid_palm','dance_front_center_palm',
            'dance_front_right_palm','dance_front_second_right_palm','dance_far_right_palm',
            'obelisk_west','obelisk_middle','obelisk_east','obelisk_far_east','obelisk_corner'})
        self.assertTrue(all(part['depth']>max(walls) for part in front),front)
        self.assertFalse(any(part['type']=='marked-foreground' for part in depths),
                         'Authored strokes must not restore obsolete baked foreground masks')
        self.page.locator('#view').screenshot(path='/tmp/environment-world-update.png')

    def test_existing_local_project_keeps_priority_over_the_new_publication(self):
        local=copy.deepcopy(self.current)
        local['assets'][0]['x']+=32
        local['characters']['riff']['x']-=16
        self.load_local_project(local)
        self.assertEqual(self.project(),local)
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProjectSource()'),'local')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole.ready()')
        self.assertEqual(self.project(),local)
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getPublishedProject()'),self.current)

    def test_full_fx_flicker_uses_new_background_and_does_not_restore_old_dj_art(self):
        html=(fixture.ROOT/'world-preview.html').read_text()
        html=html.replace('function neonFlickerPower(idx){','function neonFlickerPower(idx){return .38;',1)
        self.context.route('**/world-preview.html*',lambda route:route.fulfill(
            status=200,content_type='text/html',body=html))
        self.context.add_init_script(r'''(()=>{
          window.environmentImageDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(...args){
            if(args.length===9&&args[0]?.src&&/arcade-flat-floor-world\.png|empty-arcade\.png/.test(args[0].src)&&environmentImageDraws.length<1000)
              environmentImageDraws.push({src:args[0].src,rect:args.slice(1,5)});
            return draw.apply(this,args);
          };
        })()''')
        self.load();self.page.evaluate('environmentImageDraws=[]')
        self.page.locator('#worldMenuBtn').click()
        for _ in range(3):
            if self.page.locator('#fxBtn').inner_text().endswith('Full'):break
            self.page.locator('#fxBtn').click()
        self.page.locator('#worldMenuBtn').click();self.frames()
        draws=self.page.evaluate('environmentImageDraws')
        legacy=[draw['rect'] for draw in draws if 'arcade-flat-floor-world.png' in draw['src']]
        self.assertTrue(all(rect in ([848,89,61,71],[360,501,65,81]) for rect in legacy),legacy)
        fresh=[draw['rect'] for draw in draws if 'empty-arcade.png' in draw['src']]
        self.assertIn([206,42,108,48],fresh,'Fixed signs must flicker using the new room artwork')
        self.assertNotIn([341,620,93,39],fresh,'The old Dance console region is no longer a fixed wall sign')

    def test_background_pixel_editor_and_region_copy_preserve_the_authored_plate(self):
        console=(fixture.ROOT/'developer-console.js').read_text()
        console+='''
const originalEnvironmentConsole=window.createCodaDeveloperConsole;
window.createCodaDeveloperConsole=api=>{const instance=originalEnvironmentConsole(api);window.environmentTestConsole=instance;return instance;};'''
        self.context.route('**/developer-console.js*',lambda route:route.fulfill(
            status=200,content_type='text/javascript',body=console))
        self.load();self.open_tab('artwork')
        self.page.evaluate('CodaDeveloperConsole.getArtworkEditor().selectTarget("background.world")')
        self.page.wait_for_function('''()=>{const state=CodaDeveloperConsole.getArtworkEditor().getState();return !state.loading&&state.target==='background.world';}''')
        with self.page.expect_download() as pending:
            self.page.locator('[data-artwork-editor]:visible [data-artwork-export]').click()
        from PIL import Image, ImageChops
        with Image.open(pending.value.path()) as exported, self.authored_background() as background:
            self.assertEqual(exported.size,background.size)
            self.assertEqual(ImageChops.difference(exported.convert('RGBA'),background.convert('RGBA')).getextrema(),((0,0),)*4,
                             'Background Export PNG must include the uploaded pixels without flattening placed assets')
        self.assertEqual(self.project(),self.current)
        self.page.locator('[data-artwork-editor]:visible [data-artwork-exit]').click();self.frames()
        self.page.locator('#assetList').select_option('asset-1')
        self.assertTrue(self.page.locator('#devLegacyRepair').is_hidden())
        self.assertTrue(self.page.locator('#devRelease').is_visible())
        self.assertEqual(self.page.locator('#devLiftRegion').inner_text(),'Copy background region')
        region=self.page.evaluate('''()=>{
          const asset=environmentTestConsole.liftedRegion([180,160,24,24]);
          const image=environmentTestConsole.originalPicture(asset);
          return {name:asset.origin.name,pixel:Array.from(image.getContext('2d').getImageData(8,8,1,1).data)};
        }''')
        self.assertTrue(region['name'].startswith('region-'))
        self.assertEqual(region['pixel'],self.background_pixel(188,168),
                         'A copied region at the old couch location must use clean carpet, not the old baked couch')

    def test_speaker_effect_emitters_follow_asset_geometry_opacity_and_visibility(self):
        self.load();self.page.locator('#worldMenuBtn').click()
        for _ in range(3):
            if self.page.locator('#fxBtn').inner_text().endswith('Full'):break
            self.page.locator('#fxBtn').click()
        self.page.locator('#worldMenuBtn').click();self.open_tab('objects')
        self.page.locator('#assetList').select_option('asset-15')
        for field,value in [('assetX',699),('assetY',219),('assetW',144),('assetH',248),('assetRotate',90),('assetOpacity',50)]:
            self.field(field,value)
        self.frames()
        emitter=next(item for item in self.page.evaluate('CodaArcadeQA.environment().speakers') if item['assetId']=='asset-15')
        self.assertAlmostEqual(emitter['opacity'],.5)
        self.assertAlmostEqual(emitter['transform']['rotation'],3.141592653589793/2)
        self.assertAlmostEqual(emitter['drivers'][0]['x'],699+248*.16)
        self.assertAlmostEqual(emitter['drivers'][0]['y'],219)
        self.assertAlmostEqual(emitter['drivers'][1]['x'],699-248*.24)
        self.assertAlmostEqual(emitter['drivers'][1]['y'],219)
        self.page.locator('#assetVisible').uncheck();self.frames()
        self.assertNotIn('asset-15',[item['assetId'] for item in self.page.evaluate('CodaArcadeQA.environment().speakers')],
                         'Hiding a refreshed speaker must remove its rings/notes rather than leave legacy fixed emitters behind')

    def test_hiding_counter_reveals_finished_background_instead_of_a_clone_patch(self):
        self.load();point=(1490,520);expected=list(self.authored_background().getpixel(point))
        before=self.world_pixel(*point);self.assertNotEqual(before,expected)
        self.open_tab('objects');self.page.locator('#assetList').select_option('asset-2')
        self.page.locator('#assetVisible').uncheck();self.frames()
        self.assertEqual(self.world_pixel(*point),expected)
        self.page.locator('#devUndo').click();self.frames()
        self.assertEqual(self.world_pixel(*point),before)
        self.page.locator('#devRedo').click();self.frames()
        self.assertEqual(self.world_pixel(*point),expected)

    def test_unlifted_cabinets_still_have_bodies_over_the_empty_backdrop(self):
        local=copy.deepcopy(self.current)
        local['assets']=[asset for asset in local['assets'] if asset.get('origin',{}).get('name') not in (
            'cabinet_pitch_race','cabinet_music_triad','cabinet_rhythm_room','cabinet_song_machine')]
        self.load_local_project(local)
        for x,y in [(715,250),(830,250),(960,250),(1080,250)]:
            self.assertNotEqual(self.world_pixel(x,y),self.background_pixel(x,y),
                                'A cabinet restored to its original position must keep its body')
        self.assertEqual(len(self.page.evaluate('CodaArcadeQA.worldObjects().filter(x=>x.game)')),4)

    def test_big_curved_lounge_couch_keeps_its_native_width_and_portable_pixels(self):
        self.load();sofa=next(asset for asset in self.project()['assets'] if asset.get('origin',{}).get('name')=='lounge_sofa')
        self.assertEqual((sofa['w'],sofa['h']),(288,105))
        self.page.evaluate('CodaDeveloperConsole.open("artwork")')
        self.page.evaluate('CodaDeveloperConsole.getArtworkEditor().selectTarget("object.lounge_sofa")')
        self.page.wait_for_function('''()=>{const state=CodaDeveloperConsole.getArtworkEditor().getState();return !state.loading&&state.target==='object.lounge_sofa';}''')
        with self.page.expect_download() as pending:
            self.page.locator('[data-artwork-editor]:visible [data-artwork-export]').click()
        from PIL import Image
        with Image.open(pending.value.path()) as image:
            self.assertEqual(image.size,(288,105));box=image.getchannel('A').getbbox()
            self.assertGreater(box[2]-box[0],225,'The large curved couch must not shrink into a small straight sofa')
        self.assertEqual(self.project(),self.current,'Viewing/exporting replacement art must not save a local override')


if __name__ == '__main__':
    unittest.main(verbosity=2)
