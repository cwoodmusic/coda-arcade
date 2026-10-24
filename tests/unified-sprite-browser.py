"""Verify a shared original face across every wardrobe and musician appearance.

Static comparisons use reduced motion to select one idle pose for every actor.
The reference is drawn directly from the immutable original PNG, not new sheets.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_PROFILE = {
    'skin': '#e5ad75', 'hair': '#171424', 'shirt': '#e94038',
    'lowerColor': '#235cb9', 'hairstyle': 'short', 'outfit': 'pants',
    # Explicitly avoid the canonical full-sprite shortcut: test composed layers.
    'headwear': 'none', 'eyewear': 'none', 'accessory': 'none',
    'shoes': 'sneakers', 'emote': 'wave',
}


class UnifiedFixtureHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.split('?')[0] != '/unified-sprite-fixture.html':
            return super().do_GET()
        html = b'''<!doctype html><meta charset="utf-8"><title>Unified original sprite regression</title>
<script src="sprite-animation.js"></script><script src="character-renderer.js"></script>
<script src="npc-behavior.js"></script><script>
window.unifiedReady=false;window.unifiedError=null;
window.unifiedRenderer=createCodaCharacterRenderer({reducedMotion:()=>true});
window.originalAtlas=new Image();originalAtlas.src='coda_arcade_phase73_characters.png';
Promise.all([unifiedRenderer.ready,originalAtlas.decode()]).then(([manifest])=>{
  window.unifiedManifest=manifest;unifiedReady=true;
}).catch(error=>{unifiedError=error.message;});
</script>'''
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(html)))
        self.end_headers()
        self.wfile.write(html)


class UnifiedSpriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(UnifiedFixtureHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/unified-sprite-fixture.html'

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.errors, self.failures, self.requests = [], [], []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('request', lambda request: self.requests.append(request.url))
        self.page.on('response', lambda response: self.failures.append(response.url)
                     if response.status >= 400 and not response.url.endswith('favicon.ico') else None)
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_function('unifiedReady || unifiedError', timeout=20000)
        self.assertIsNone(self.page.evaluate('unifiedError'))
        self.assertEqual(self.page.evaluate('unifiedRenderer.getState().sourcePolicy'), 'original-atlas-only')
        # Install comparison helpers only in this disposable test page.
        self.page.evaluate('''()=>{
          const make=()=>Object.assign(document.createElement('canvas'),{width:160,height:140});
          const reference=make(),g=reference.getContext('2d');g.imageSmoothingEnabled=false;
          // Original hero_down_0 and the pre-upgrade drawActor formula at (80,100).
          const width=Math.min(39,53*47/69);
          g.drawImage(originalAtlas,16,5,47,69,Math.round(80-width/2),47,Math.round(width),53);
          const roi={x:70,y:69,w:20,h:8},expected=g.getImageData(roi.x,roi.y,roi.w,roi.h).data;
          window.originalFaceReference={colors:new Set(Array.from({length:expected.length/4},(_,i)=>Array.from(expected.slice(i*4,i*4+3)).join(','))).size,
            darkPixels:Array.from({length:expected.length/4},(_,i)=>Math.max(...expected.slice(i*4,i*4+3))<70).filter(Boolean).length};
          window.compareOriginalFace=(profile,npcId)=>{
            const canvas=make(),ctx=canvas.getContext('2d');
            const drawn=npcId?unifiedRenderer.drawNPC(ctx,{id:npcId,x:80,y:100,facing:'down',walking:false,activity:'idle',appearance:profile},0):
              unifiedRenderer.drawPlayer(ctx,profile,{x:80,y:100,facing:'down',walking:false,phase:0},0);
            const actual=ctx.getImageData(roi.x,roi.y,roi.w,roi.h).data;let differentChannels=0;const first=[];
            for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i]){
              differentChannels++;if(first.length<6)first.push({x:roi.x+Math.floor(i/4)%roi.w,y:roi.y+Math.floor(i/4/roi.w),channel:i%4,actual:actual[i],expected:expected[i]});
            }
            const pixels=ctx.getImageData(0,0,160,140).data;let minX=160,minY=140,maxX=-1,maxY=-1;
            for(let y=0;y<140;y++)for(let x=0;x<160;x++)if(pixels[(y*160+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
            return {drawn,differentChannels,first,bounds:{minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1}};
          };
        }''')
        reference = self.page.evaluate('originalFaceReference')
        self.assertGreater(reference['colors'], 5, 'Face reference must include real source detail')
        self.assertGreater(reference['darkPixels'], 3, 'The compared core must include original facial features')

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Browser script errors')
        self.assertEqual(self.failures, [], 'Failed sprite resources')

    def assert_same_face(self, result):
        self.assertTrue(result['drawn'])
        self.assertEqual(result['differentChannels'], 0, json.dumps(result))
        # Hair may add volume, but every style retains the compact original rig.
        self.assertLessEqual(result['bounds']['width'], 50, json.dumps(result['bounds']))
        self.assertGreaterEqual(result['bounds']['height'], 40, json.dumps(result['bounds']))
        self.assertLessEqual(result['bounds']['height'], 60, json.dumps(result['bounds']))

    def test_all_48_hairstyle_outfit_combinations_keep_the_original_face(self):
        results = self.page.evaluate('''profile=>{
          const results=[];
          for(const hairstyle of unifiedRenderer.catalog.hairstyles)for(const outfit of unifiedRenderer.catalog.outfits){
            const appearance={...profile,hairstyle:hairstyle.id,outfit:outfit.id};
            results.push({hairstyle:hairstyle.id,outfit:outfit.id,result:compareOriginalFace(appearance)});
          }
          return results;
        }''', ORIGINAL_PROFILE)
        self.assertEqual(len(results), 48, 'All eight hairstyles and six outfits must execute')
        for item in results:
            with self.subTest(hairstyle=item['hairstyle'], outfit=item['outfit']):
                self.assert_same_face(item['result'])

    def test_all_nine_musicians_keep_the_same_core_under_their_own_costumes(self):
        # Retain each musician's hairstyle and outfit; normalize only the face
        # color and remove facial wearables so the underlying core is visible.
        results = self.page.evaluate('''()=>CodaMusicianCast.map(person=>({id:person.id,
          result:compareOriginalFace({skin:'#e5ad75',headwear:'none',eyewear:'none',accessory:'none'},person.id)
        }))''')
        self.assertEqual(len(results), 9)
        self.assertEqual(len({item['id'] for item in results}), 9)
        for item in results:
            with self.subTest(musician=item['id']):
                self.assert_same_face(item['result'])

    def test_bald_back_view_has_no_inherited_blue_hair(self):
        result=self.page.evaluate('''profile=>{
          const canvas=Object.assign(document.createElement('canvas'),{width:80,height:96}),g=canvas.getContext('2d');
          unifiedRenderer.drawPlayer(g,{...profile,hairstyle:'bald'},
            {x:40,y:88,facing:'up',walking:false},0);
          const pixels=g.getImageData(29,51,23,17).data;let opaque=0,blue=0;
          for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200){
            opaque++;if(pixels[i+2]>pixels[i]*1.2&&pixels[i+2]>pixels[i+1]*1.05&&pixels[i+2]>45)blue++;
          }
          return {opaque,blue};
        }''',ORIGINAL_PROFILE)
        self.assertGreater(result['opaque'],100,'The test must sample the visible back of the head')
        self.assertEqual(result['blue'],0,'Selecting bald must remove the source hero’s blue hair')

    def test_all_manifest_layers_and_loaded_art_use_only_the_original_atlas_policy(self):
        contract = self.page.evaluate('''()=>{
          const layers=[];
          for(const [category,definition]of Object.entries(unifiedManifest.layers)){
            if(definition.url)layers.push({category,...definition});
            else for(const [id,descriptor]of Object.entries(definition.variants||definition))if(descriptor.url)layers.push({category,id,...descriptor});
          }
          return {policy:unifiedManifest.sourcePolicy,artwork:unifiedManifest.sourceArtwork,layers};
        }''')
        self.assertEqual(contract['policy'], 'original-atlas-only')
        self.assertEqual(contract['artwork'], ['coda_arcade_phase73_characters.png'])
        self.assertEqual(len(contract['layers']), 38, 'The provenance check must cover every active layer')
        for layer in contract['layers']:
            with self.subTest(category=layer['category'], variant=layer.get('id')):
                self.assertEqual(layer.get('source'), 'original-atlas')
                self.assertNotIn('/source/', layer['url'])
        png_requests = [urlparse(url).path for url in self.requests if urlparse(url).path.endswith('.png')]
        self.assertGreaterEqual(len(set(png_requests)), 39, 'Load every active layer and the immutable atlas')
        self.assertFalse(any('/assets/characters/source/' in path for path in png_requests), png_requests)
        allowed = {'/coda_arcade_phase73_characters.png'} | {
            '/assets/characters/' + layer['url'] for layer in contract['layers']}
        self.assertTrue(set(png_requests).issubset(allowed), sorted(set(png_requests) - allowed))


if __name__ == '__main__':
    unittest.main(verbosity=2)
