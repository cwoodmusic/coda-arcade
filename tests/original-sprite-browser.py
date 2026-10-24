"""Compare the classic player to the original atlas using the legacy draw math.

Uses isolated canvases, without world lighting, nameplates, or editor overlays.
Requires Python Playwright and the environment's /usr/bin/chromium.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CLASSIC_LOOK = {
    'hairstyle': 'short', 'hair': '#171424', 'skin': '#e5ad75',
    'outfit': 'pants', 'shirt': '#e94038', 'lowerColor': '#235cb9',
    'headwear': 'cap', 'eyewear': 'none', 'accessory': 'none',
    'shoes': 'sneakers', 'emote': 'wave',
}
# Immutable original source rectangles, rather than rectangles from the new baker.
SOURCE_FRAMES = {
    'down': [[16, 5, 47, 69], [97, 5, 45, 69], [178, 5, 44, 69], [259, 5, 42, 69], [338, 5, 44, 69]],
    'left': [[816, 5, 47, 69], [896, 5, 47, 69], [16, 85, 47, 69], [96, 85, 47, 69], [176, 85, 47, 69]],
    'up': [[416, 6, 47, 67], [497, 6, 45, 67], [578, 6, 44, 67], [658, 6, 43, 67], [739, 6, 42, 67]],
    'right': [[256, 85, 47, 69], [336, 85, 47, 69], [416, 85, 47, 69], [496, 85, 47, 69], [576, 85, 47, 69]],
}


class SpriteFixtureHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.split('?')[0] != '/original-sprite-fixture.html':
            return super().do_GET()
        html = b'''<!doctype html><meta charset="utf-8"><title>Original sprite regression</title>
<script src="sprite-animation.js"></script><script src="character-renderer.js"></script>
<script>
window.spriteFixtureReady=false;window.spriteFixtureError=null;
window.spriteRenderer=createCodaCharacterRenderer();
window.referenceAtlas=new Image();referenceAtlas.src='coda_arcade_phase73_characters.png';
Promise.all([spriteRenderer.ready,referenceAtlas.decode()]).then(()=>{spriteFixtureReady=true;})
.catch(error=>{spriteFixtureError=error.message;});
</script>'''
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(html)))
        self.end_headers()
        self.wfile.write(html)


class OriginalSpriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(SpriteFixtureHandler, directory=str(ROOT))
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/original-sprite-fixture.html'

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.errors = []
        self.failures = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.failures.append(response.url)
                     if response.status >= 400 and not response.url.endswith('favicon.ico') else None)
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_function('spriteFixtureReady || spriteFixtureError', timeout=20000)
        self.assertIsNone(self.page.evaluate('spriteFixtureError'))
        self.assertEqual(self.page.evaluate('spriteRenderer.getState().artStyle'), 'original-atlas')

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Browser script errors')
        self.assertEqual(self.failures, [], 'Failed sprite resources')

    def comparison(self, facing, source_index=0, walking=False, phase=0):
        return self.page.evaluate('''({profile,facing,source,walking,phase})=>{
          const make=()=>Object.assign(document.createElement('canvas'),{width:160,height:140});
          const expected=make(),actual=make(),reference=expected.getContext('2d'),drawn=actual.getContext('2d');
          const [sx,sy,sw,sh]=source,x=80,y=100,height=53;
          // This is drawActor from e3b418e, including its width cap and rounding.
          const width=Math.min(39,height*sw/sh);
          reference.imageSmoothingEnabled=false;
          reference.drawImage(referenceAtlas,sx,sy,sw,sh,
            Math.round(x-width/2),Math.round(y-height),Math.round(width),height);
          const rendered=spriteRenderer.drawPlayer(drawn,profile,
            {x,y,facing,walking,phase},0);
          const a=drawn.getImageData(0,0,160,140).data,b=reference.getImageData(0,0,160,140).data;
          let differentChannels=0,differentPixels=0,expectedOpaque=0,actualOpaque=0;const first=[];
          for(let i=0;i<a.length;i+=4){
            if(a[i+3])actualOpaque++;if(b[i+3])expectedOpaque++;
            let different=false;
            for(let c=0;c<4;c++)if(a[i+c]!==b[i+c]){differentChannels++;different=true;}
            if(different){differentPixels++;if(first.length<5)first.push({x:i/4%160,y:Math.floor(i/4/160),actual:Array.from(a.slice(i,i+4)),expected:Array.from(b.slice(i,i+4))});}
          }
          return {rendered,differentChannels,differentPixels,expectedOpaque,actualOpaque,first};
        }''', {
            'profile': CLASSIC_LOOK, 'facing': facing,
            'source': SOURCE_FRAMES[facing][source_index],
            'walking': walking, 'phase': phase,
        })

    def assert_original_pixels(self, result):
        self.assertTrue(result['rendered'], 'Loaded original sprites must draw')
        self.assertGreater(result['expectedOpaque'], 0, 'Reference must contain actual original pixels')
        self.assertEqual(result['differentChannels'], 0, json.dumps(result))

    def test_original_idle_pixels_match_all_four_facings(self):
        for facing in SOURCE_FRAMES:
            with self.subTest(facing=facing):
                self.assert_original_pixels(self.comparison(facing))

    def test_walking_preserves_original_five_frame_art_and_anchor(self):
        # Six timing slots reuse the old five-frame walk cycle without new art.
        source_indices = [0, 1, 2, 3, 4, 1]
        import math
        for facing in SOURCE_FRAMES:
            for slot, source_index in enumerate(source_indices):
                with self.subTest(facing=facing, slot=slot, source_index=source_index):
                    # Sample inside each phase slot, away from floating-point boundaries.
                    phase = (slot + 0.25) / 6 * math.tau
                    self.assert_original_pixels(self.comparison(
                        facing, source_index=source_index, walking=True, phase=phase))

    def test_emotes_use_whole_original_poses_without_body_cutout_holes(self):
        for facing, sources in SOURCE_FRAMES.items():
            with self.subTest(facing=facing):
                result=self.page.evaluate('''({profile,facing,source})=>{
                  const make=()=>Object.assign(document.createElement('canvas'),{width:160,height:140});
                  const expected=make(),actual=make(),a=expected.getContext('2d'),b=actual.getContext('2d');
                  const [sx,sy,sw,sh]=source,width=Math.min(39,53*sw/sh);
                  a.imageSmoothingEnabled=false;a.drawImage(referenceAtlas,sx,sy,sw,sh,Math.round(80-width/2),47,Math.round(width),53);
                  spriteRenderer.drawPlayer(b,profile,{x:80,y:100,facing,emote:'wave',emoteTime:.2},0);
                  const x=a.getImageData(0,0,160,140).data,y=b.getImageData(0,0,160,140).data;
                  return Array.from(x).filter((value,i)=>value!==y[i]).length;
                }''', {'profile':CLASSIC_LOOK,'facing':facing,'source':sources[3]})
                self.assertEqual(result,0,'A canonical emote must retain the complete original artwork')

    def test_preview_can_enlarge_the_original_without_moving_its_feet(self):
        result = self.page.evaluate('''profile=>{
          function draw(scale){
            const canvas=Object.assign(document.createElement('canvas'),{width:320,height:220}),g=canvas.getContext('2d');
            spriteRenderer.drawPlayer(g,profile,{x:160,y:180,facing:'down',walking:false,scale},0);
            const data=g.getImageData(0,0,320,220).data;let minX=320,minY=220,maxX=-1,maxY=-1,count=0;
            for(let y=0;y<220;y++)for(let x=0;x<320;x++)if(data[(y*320+x)*4+3]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
            return {minX,minY,maxX,maxY,count,width:maxX-minX+1,height:maxY-minY+1};
          }
          return {normal:draw(1),preview:draw(2)};
        }''', CLASSIC_LOOK)
        normal, preview = result['normal'], result['preview']
        self.assertEqual(normal['height'], 53)
        self.assertEqual(preview['height'], 106)
        self.assertEqual(normal['maxY'], 179)
        self.assertEqual(preview['maxY'], normal['maxY'], 'Scaling must retain the same gameplay foot anchor')
        self.assertGreater(preview['count'], normal['count'] * 3)
        self.assertLess(preview['minY'], normal['minY'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
