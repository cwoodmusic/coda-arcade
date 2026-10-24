"""Verify the redrawn face across every wardrobe and musician appearance.

Static comparisons use reduced motion to select one idle pose for every actor.
The reference is drawn from the new bald gray source art, not an old capped sprite.
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
    'skin': '#e5ad75', 'hair': '#171424', 'shirt': '#999ca6',
    'lowerColor': '#626875', 'hairstyle': 'bald', 'outfit': 'pants',
    # Explicitly avoid the canonical full-sprite shortcut: test composed layers.
    'headwear': 'none', 'eyewear': 'none', 'accessory': 'none',
    'shoes': 'sneakers', 'emote': 'wave',
}


REFERENCE_HELPER = r"""()=>{
  window.redrawnReference=direction=>{
    const frame=unifiedManifest.baseAvatar.frames[direction],crop=frame.source;
    const cut=Object.assign(document.createElement('canvas'),{width:crop.w,height:crop.h}),g=cut.getContext('2d',{willReadFrequently:true});
    g.drawImage(redrawnAtlas,crop.x,crop.y,crop.w,crop.h,0,0,crop.w,crop.h);
    const pixels=g.getImageData(0,0,crop.w,crop.h),seen=new Uint8Array(crop.w*crop.h);let largest=[];
    for(let seed=0;seed<seen.length;seed++)if(pixels.data[seed*4+3]>=128&&!seen[seed]){
      const queue=[seed];seen[seed]=1;
      for(let at=0;at<queue.length;at++){const id=queue[at],x=id%crop.w,y=Math.floor(id/crop.w);for(let yy=Math.max(0,y-1);yy<=Math.min(crop.h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(crop.w-1,x+1);xx++){const next=yy*crop.w+xx;if(!seen[next]&&pixels.data[next*4+3]>=128){seen[next]=1;queue.push(next);}}}
      if(queue.length>largest.length)largest=queue;
    }
    const mask=new Uint8Array(seen.length);for(const at of largest)mask[at]=1;
    for(let at=0;at<mask.length;at++)pixels.data[at*4+3]=mask[at]?255:0;g.putImageData(pixels,0,0);
    const out=Object.assign(document.createElement('canvas'),{width:80,height:96}),paint=out.getContext('2d');paint.imageSmoothingEnabled=false;
    paint.drawImage(cut,0,0,crop.w,crop.h,...frame.placement,frame.width,frame.height);return out;
  };
}"""


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
window.redrawnAtlas=new Image();redrawnAtlas.src='assets/characters/source/base-avatar-gray.png';
Promise.all([unifiedRenderer.ready,redrawnAtlas.decode()]).then(([manifest])=>{
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
        self.assertEqual(self.page.evaluate('unifiedRenderer.getState().sourcePolicy'), 'redrawn-base-and-original-cosmetics')
        self.page.evaluate(REFERENCE_HELPER)
        # Compare the actual newly drawn bald face, not the old cap-derived face.
        self.page.evaluate('''()=>{
          const make=()=>Object.assign(document.createElement('canvas'),{width:160,height:140});
          const reference=make(),g=reference.getContext('2d');g.imageSmoothingEnabled=false;
          g.drawImage(redrawnReference(0),40,12);
          const roi={x:71,y:65,w:18,h:10},expected=g.getImageData(roi.x,roi.y,roi.w,roi.h).data;
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

    def test_all_48_hairstyle_outfit_combinations_keep_the_redrawn_face(self):
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

    def test_gray_shirt_and_pants_dyes_are_independent_in_every_facing(self):
        results=self.page.evaluate('''profile=>{
          const results=[],draw=(look,facing)=>{const c=Object.assign(document.createElement('canvas'),{width:80,height:96});unifiedRenderer.drawPlayer(c.getContext('2d'),look,{x:40,y:88,facing},0);return c.getContext('2d').getImageData(0,0,80,96).data;};
          const changed=(a,b,x1,y1,x2,y2)=>{let count=0;for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const at=(y*80+x)*4;if([0,1,2,3].some(c=>a[at+c]!==b[at+c]))count++;}return count;};
          for(const [direction,facing]of ['down','left','up','right'].entries()){
            const base=draw(profile,facing),shirt=draw({...profile,shirt:'#d44354'},facing),pants=draw({...profile,lowerColor:'#3a8b9e'},facing),frame=unifiedManifest.baseAvatar.frames[direction];
            const shirtRegion=[34,frame.clothesTop+2,46,frame.waist-1],pantsRegion=[33,frame.waist+1,47,frame.shoeTop];
            results.push({facing,shirtChanged:changed(base,shirt,...shirtRegion),shirtLeavesPants:changed(base,shirt,...pantsRegion),pantsChanged:changed(base,pants,...pantsRegion),pantsLeaveShirt:changed(base,pants,...shirtRegion)});
          }return results;
        }''',ORIGINAL_PROFILE)
        for item in results:
            with self.subTest(facing=item['facing']):
                self.assertGreater(item['shirtChanged'],15,'Gray shirt pixels must take the selected shirt color')
                self.assertGreater(item['pantsChanged'],8,'Gray pants pixels must take the selected lower color')
                self.assertEqual(item['shirtLeavesPants'],0,'Shirt dye must not recolor pants')
                self.assertEqual(item['pantsLeaveShirt'],0,'Pants dye must not recolor the shirt')

    def test_bald_back_view_has_no_inherited_blue_hair(self):
        result=self.page.evaluate('''profile=>{
          const canvas=Object.assign(document.createElement('canvas'),{width:80,height:96}),g=canvas.getContext('2d');
          unifiedRenderer.drawPlayer(g,{...profile,hairstyle:'bald'},
            {x:40,y:88,facing:'up',walking:false},0);
          const head=unifiedManifest.baseAvatar.headWindows[2];
          const pixels=g.getImageData(head.x+Math.floor(head.w*.25),head.y+Math.floor(head.h*.38),Math.floor(head.w*.5),Math.floor(head.h*.35)).data;let opaque=0,blue=0;
          for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200){
            opaque++;if(pixels[i+2]>pixels[i]*1.2&&pixels[i+2]>pixels[i+1]*1.05&&pixels[i+2]>45)blue++;
          }
          return {opaque,blue};
        }''',ORIGINAL_PROFILE)
        self.assertGreater(result['opaque'],100,'The test must sample the visible back of the head')
        self.assertEqual(result['blue'],0,'Selecting bald must remove the source hero’s blue hair')

    def test_all_active_layers_declare_the_redrawn_base_and_original_cosmetic_sources(self):
        contract = self.page.evaluate('''()=>{
          const layers=[];
          for(const [category,definition]of Object.entries(unifiedManifest.layers)){
            if(definition.url)layers.push({category,...definition});
            else for(const [id,descriptor]of Object.entries(definition.variants||definition))if(descriptor.url)layers.push({category,id,...descriptor});
          }
          return {policy:unifiedManifest.sourcePolicy,artwork:unifiedManifest.sourceArtwork,layers};
        }''')
        self.assertEqual(contract['policy'], 'redrawn-base-and-original-cosmetics')
        self.assertEqual(set(contract['artwork']), {'coda_arcade_phase73_characters.png','assets/characters/source/base-avatar-gray.png'})
        self.assertEqual(len(contract['layers']), 38, 'The provenance check must cover every active layer')
        for layer in contract['layers']:
            with self.subTest(category=layer['category'], variant=layer.get('id')):
                expected='redrawn-base' if layer['category'] in {'body','outfit','shoes','original'} else 'original-atlas'
                self.assertEqual(layer.get('source'), expected)
                self.assertNotIn('/source/', layer['url'])
        png_requests = [urlparse(url).path for url in self.requests if urlparse(url).path.endswith('.png')]
        self.assertGreaterEqual(len(set(png_requests)), 39, 'Load every active layer and the immutable atlas')
        archived={'body-poses.png','hair.png','outfits.png','headwear.png','accessories.png','shoes-props.png'}
        self.assertFalse(any(path.startswith('/assets/characters/source/') and path.rsplit('/',1)[-1] in archived for path in png_requests), png_requests)
        allowed = {'/coda_arcade_phase73_characters.png','/assets/characters/source/base-avatar-gray.png'} | {
            '/assets/characters/' + layer['url'] for layer in contract['layers']}
        self.assertTrue(set(png_requests).issubset(allowed), sorted(set(png_requests) - allowed))


if __name__ == '__main__':
    unittest.main(verbosity=2)
