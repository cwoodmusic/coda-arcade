"""Check original sprite fidelity and a stable, alternating compiled walk.

Uses actual runtime renders in isolated canvases. The frontal idle reference is
independent of the baker; motion checks reject the clipped cap, resizing heads,
blue sheet dividers and one-frame squat seen in the reported recording.
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
# Keep only the intact original frontal idle as the immutable pixel reference.
# Side views are intentionally repaired; old crop rectangles are not references.
FRONT_IDLE = [16, 5, 47, 69]
DIRECTIONS = ['down', 'left', 'up', 'right']


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
Promise.all([spriteRenderer.ready,referenceAtlas.decode()]).then(([manifest])=>{window.spriteManifest=manifest;spriteFixtureReady=true;})
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

    def comparison(self):
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
            'profile': CLASSIC_LOOK, 'facing': 'down',
            'source': FRONT_IDLE, 'walking': False, 'phase': 0,
        })

    def assert_original_pixels(self, result):
        self.assertTrue(result['rendered'], 'Loaded original sprites must draw')
        self.assertGreater(result['expectedOpaque'], 0, 'Reference must contain actual original pixels')
        self.assertEqual(result['differentChannels'], 0, json.dumps(result))

    def test_original_front_idle_retains_every_original_pixel(self):
        self.assert_original_pixels(self.comparison())

    def test_all_walks_keep_the_head_fixed_and_alternate_grounded_feet(self):
        results = self.page.evaluate('''profile=>{
          const make=()=>Object.assign(document.createElement('canvas'),{width:80,height:96});
          const sample=(look,facing,slot)=>{
            const canvas=make(),g=canvas.getContext('2d');
            spriteRenderer.drawPlayer(g,look,{x:40,y:88,facing,walking:true,phase:(slot+.25)/6*Math.PI*2},0);
            // Include the complete cap, hair, face and neck above swinging arms.
            const headEnd={down:69,left:66,up:69,right:66}[facing];
            const pixels=g.getImageData(0,0,80,96).data,head=g.getImageData(0,0,80,headEnd).data;
            let left=-1,right=-1,minX=80,maxX=-1,minY=96,maxY=-1,headX1=80,headX2=-1;
            const shoeRowWidths=[];let longestBlueRun=0;
            for(let y=0;y<96;y++){
              let lo=80,hi=-1,blueRun=0;
              for(let x=0;x<80;x++)if(pixels[(y*80+x)*4+3]){
                minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
                if(y<headEnd){headX1=Math.min(headX1,x);headX2=Math.max(headX2,x);}
                if(y>=80){
                  const at=(y*80+x)*4,r=pixels[at],green=pixels[at+1],b=pixels[at+2];
                  // Orange/red sneaker pixels distinguish the shoes from the
                  // held brass trumpet, which also reaches these low rows.
                  if(r>green*1.4&&r>b*1.5&&r>70){
                    lo=Math.min(lo,x);hi=Math.max(hi,x);
                    if(x<40)left=Math.max(left,y);else right=Math.max(right,y);
                  }
                }
              }
              if(y>=80){
                shoeRowWidths.push(hi>=lo?hi-lo+1:0);
                for(let x=0;x<80;x++){
                  const at=(y*80+x)*4,r=pixels[at],green=pixels[at+1],b=pixels[at+2];
                  blueRun=pixels[at+3]&&b>r*1.4&&b>green*1.1&&b>45?blueRun+1:0;
                  longestBlueRun=Math.max(longestBlueRun,blueRun);
                }
              }
            }
            return {head:Array.from(head).join(','),lower:Array.from(g.getImageData(0,65,80,31).data).join(','),
              left,right,minX,maxX,minY,maxY,headWidth:headX2-headX1+1,shoeRowWidths,longestBlueRun};
          };
          const results=[];
          for(const [name,look]of [['canonical',profile],['custom trumpet',{...profile,accessory:'trumpet'}]]){
            for(const facing of ['down','left','up','right']){
              const frames=Array.from({length:6},(_,slot)=>sample(look,facing,slot)),first=frames[0];
              results.push({name,facing,headUnchanged:frames.every(frame=>frame.head===first.head),
                distinctLowerFrames:new Set(frames.map(frame=>frame.lower)).size,
                frames:frames.map(({head,lower,...metrics})=>metrics)});
            }
          }
          return results;
        }''', CLASSIC_LOOK)
        self.assertEqual(len(results), 8, 'Both whole-sprite and layered rendering must execute')
        for item in results:
            with self.subTest(look=item['name'], facing=item['facing']):
                self.assertTrue(item['headUnchanged'], 'Walking must not resize, redraw or move the head')
                self.assertGreaterEqual(item['distinctLowerFrames'], 3, 'Walking must move actual limb pixels')
                widths = {frame['headWidth'] for frame in item['frames']}
                self.assertEqual(len(widths), 1, 'Hair and cap width must stay fixed throughout a stride')
                foot_differences = []
                for frame in item['frames']:
                    self.assertTrue(86 <= frame['maxY'] <= 87, json.dumps(item))
                    self.assertLessEqual(abs(frame['maxY'] - 87), 1, 'Keep the shared ground anchor')
                    self.assertGreater(frame['minY'], 0, 'The complete cap must fit in the cell')
                    self.assertLess(frame['maxY'], 95)
                    self.assertTrue(40 <= frame['maxY'] - frame['minY'] + 1 <= 55)
                    self.assertGreater(frame['left'], 79, 'Left shoe must remain visible')
                    self.assertGreater(frame['right'], 79, 'Right shoe must remain visible')
                    self.assertLessEqual(max(frame['shoeRowWidths']), 24,
                                         'A stride must not jump into the source sheet’s wide squat pose')
                    self.assertLess(frame['longestBlueRun'], 20,
                                    'Foot rows must not contain the old blue sheet divider')
                    foot_differences.append(frame['left'] - frame['right'])
                self.assertGreater(max(foot_differences), 0, 'One half-cycle must lift the right foot')
                self.assertLess(min(foot_differences), 0, 'The opposite half-cycle must lift the left foot')

    def test_repaired_right_cap_and_body_mirror_the_complete_left_view(self):
        result = self.page.evaluate('''profile=>{
          const make=()=>Object.assign(document.createElement('canvas'),{width:80,height:96});
          const views={};
          for(const facing of ['left','right']){
            const canvas=make(),g=canvas.getContext('2d');
            spriteRenderer.drawPlayer(g,profile,{x:40,y:88,facing,walking:false},0);
            views[facing]=canvas;
          }
          const expected=make(),g=expected.getContext('2d');g.translate(80,0);g.scale(-1,1);g.drawImage(views.left,0,0);
          const a=g.getImageData(0,0,80,96).data,b=views.right.getContext('2d').getImageData(0,0,80,96).data;
          let differences=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
          const left=views.left.getContext('2d').getImageData(0,0,80,96).data;
          let top=96,topWidth=0,widest=0;
          for(let y=0;y<96;y++){
            let width=0;for(let x=0;x<80;x++)if(left[(y*80+x)*4+3])width++;
            if(width&&top===96){top=y;topWidth=width;}widest=Math.max(widest,width);
          }
          return {differences,top,topWidth,widest};
        }''', CLASSIC_LOOK)
        self.assertEqual(result['differences'], 0, 'Right must use the complete, clean mirrored left artwork')
        self.assertGreater(result['top'], 0)
        self.assertLess(result['topWidth'], result['widest'] * .8,
                        'The cap must start with its rounded dome, not a wide rectangular crop edge')

    def test_directional_head_bones_never_scale_during_walk(self):
        data = self.page.evaluate('''()=>['down','left','up','right'].flatMap((facing,direction)=>
          Array.from({length:6},(_,slot)=>({facing,slot,...spriteManifest.frameData[direction*28+2+slot]})))''')
        for frame in data:
            with self.subTest(facing=frame['facing'], slot=frame['slot']):
                self.assertEqual(frame.get('headX', 0), 0)
                self.assertEqual(frame.get('headY', 0), 0)
                self.assertEqual(frame.get('headScaleX', 1), 1)
                self.assertEqual(frame.get('headScaleY', 1), 1)

    def test_held_instruments_follow_the_visible_hand_in_every_walk_direction(self):
        result = self.page.evaluate('''profile=>{
          const draw=(facing,slot,accessory)=>{
            const canvas=Object.assign(document.createElement('canvas'),{width:80,height:96}),g=canvas.getContext('2d');
            // Force both controls through the same layered rendering path.
            spriteRenderer.drawPlayer(g,{...profile,shirt:'#69e0ff',accessory},{x:40,y:88,facing,walking:true,phase:(slot+.25)/6*Math.PI*2},0);
            return g.getImageData(0,0,80,96).data;
          };
          const parts={down:[48,60,71,76],left:[20,32,68,75],up:[20,32,78,84],right:[48,60,68,75]};
          const steps=[0,1,2,0,-1,-2],results=[];
          for(const [direction,facing]of ['down','left','up','right'].entries()){
            const neutral=draw(facing,0,'none'),[x1,x2,y1,y2]=parts[facing],skin=[];
            for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){
              const i=(y*80+x)*4,r=neutral[i],green=neutral[i+1],b=neutral[i+2];
              if(neutral[i+3]&&r>green*1.15&&green>b*1.1&&r>90)skin.push([x,y]);
            }
            const tops={};
            for(let slot=0;slot<6;slot++){
              const body=draw(facing,slot,'none'),shift=Math.sign(steps[slot])*(facing==='down'?-1:1);
              let matches=0;
              for(const [x,y]of skin){const a=(y*80+x)*4,b=((y+shift)*80+x)*4;if([0,1,2,3].every(c=>body[b+c]===neutral[a+c]))matches++;}
              const frame=spriteManifest.frameData[direction*28+2+slot];
              for(const accessory of ['trumpet','microphone']){
                const actual=draw(facing,slot,accessory);let top=96,count=0;
                for(let y=0;y<96;y++)for(let x=0;x<80;x++){
                  const at=(y*80+x)*4;
                  if(actual[at+3]&&Math.max(actual[at],actual[at+1],actual[at+2])>100&&
                    [0,1,2,3].some(c=>actual[at+c]!==body[at+c])){top=Math.min(top,y);count++;}
                }
                if(slot===0)tops[accessory]=top;
                results.push({facing,slot,accessory,shift,handY:frame.handY,skinSamples:skin.length,
                  matches,propShift:top-tops[accessory],propPixels:count});
              }
            }
          }
          return results;
        }''', CLASSIC_LOOK)
        for item in result:
            with self.subTest(facing=item['facing'], slot=item['slot'], instrument=item['accessory']):
                self.assertEqual(item['handY'], item['shift'], 'The attachment bone must follow its visible arm')
                self.assertGreaterEqual(item['skinSamples'], 3, 'Sample real visible hand/arm skin pixels')
                self.assertEqual(item['matches'], item['skinSamples'], json.dumps(item))
                self.assertGreater(item['propPixels'], 3, 'The instrument must remain visible')
                self.assertEqual(item['propShift'], item['shift'], 'The rendered instrument must move with the hand')

    def test_emotes_retain_a_visible_connected_body_without_empty_torso_rows(self):
        results = self.page.evaluate('''profile=>{
          const results=[];
          for(const facing of ['down','left','up','right'])for(const emote of ['wave','dance','talk','playing','sit']){
            for(const time of [0,.18,.36,.54]){
              const canvas=Object.assign(document.createElement('canvas'),{width:80,height:96}),g=canvas.getContext('2d');
              const drawn=spriteRenderer.drawPlayer(g,profile,{x:40,y:88,facing,emote,emoteTime:time},0);
              const pixels=g.getImageData(0,0,80,96).data;let minY=96,maxY=-1,count=0;
              for(let y=0;y<96;y++)for(let x=0;x<80;x++)if(pixels[(y*80+x)*4+3]){minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
              const torsoRows=[];
              for(let y=70;y<78;y++){let row=0;for(let x=34;x<46;x++)if(pixels[(y*80+x)*4+3])row++;torsoRows.push(row);}
              results.push({facing,emote,time,drawn,minY,maxY,count,torsoRows});
            }
          }
          return results;
        }''', CLASSIC_LOOK)
        for item in results:
            with self.subTest(facing=item['facing'], emote=item['emote'], time=item['time']):
                self.assertTrue(item['drawn'])
                self.assertGreater(item['count'], 500, 'A full character must remain visible')
                self.assertTrue(40 <= item['maxY'] - item['minY'] + 1 <= 58, json.dumps(item))
                self.assertGreaterEqual(min(item['torsoRows']), 4,
                                        'Arm animation must not punch empty rows through the torso')

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
