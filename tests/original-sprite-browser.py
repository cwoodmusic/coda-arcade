"""Check the bald gray redraw and continuous movement in actual runtime renders.

Motion is sampled through a complete stride, not only at atlas frame boundaries.
These checks reject a six-pose shuffle, disappearing body parts, changing head
proportions and the clipped profile seen in the reported recordings.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE_LOOK = {
    'hairstyle': 'bald', 'hair': '#171424', 'skin': '#e5ad75',
    'outfit': 'pants', 'shirt': '#999ca6', 'lowerColor': '#626875',
    'headwear': 'none', 'eyewear': 'none', 'accessory': 'none',
    'shoes': 'sneakers', 'emote': 'wave',
}
DIRECTIONS = ['down', 'left', 'up', 'right']


REFERENCE_HELPER = r"""()=>{
  window.redrawnReference=direction=>{
    const frame=spriteManifest.baseAvatar.frames[direction],crop=frame.source;
    const cut=Object.assign(document.createElement('canvas'),{width:crop.w,height:crop.h}),g=cut.getContext('2d',{willReadFrequently:true});
    g.drawImage(referenceAtlas,crop.x,crop.y,crop.w,crop.h,0,0,crop.w,crop.h);
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
window.referenceAtlas=new Image();referenceAtlas.src='assets/characters/source/base-avatar-gray.png';
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
        self.assertEqual(self.page.evaluate('spriteRenderer.getState().artStyle'), 'arcade-pixel-redraw')
        self.page.evaluate(REFERENCE_HELPER)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Browser script errors')
        self.assertEqual(self.failures, [], 'Failed sprite resources')

    def test_bald_gray_idle_matches_the_actual_redrawn_source_in_all_four_views(self):
        results=self.page.evaluate('''profile=>['down','left','up','right'].map((facing,direction)=>{
          const expected=redrawnReference(direction),actual=Object.assign(document.createElement('canvas'),{width:80,height:96}),ctx=actual.getContext('2d');
          spriteRenderer.drawPlayer(ctx,profile,{x:40,y:88,facing,walking:false},0);
          const a=ctx.getImageData(0,0,80,96).data,b=expected.getContext('2d').getImageData(0,0,80,96).data;
          let differentChannels=0,opaque=0;for(let i=0;i<a.length;i++){if(a[i]!==b[i])differentChannels++;if(i%4===3&&b[i])opaque++;}
          return {facing,differentChannels,opaque};
        })''',BASE_LOOK)
        for item in results:
            with self.subTest(facing=item['facing']):
                self.assertGreater(item['opaque'],500,'Compare a real full-body redraw')
                self.assertEqual(item['differentChannels'],0,json.dumps(item))

    def test_fresh_profile_is_bald_gray_and_every_hat_can_be_removed_exactly(self):
        result=self.page.evaluate('''profile=>{
          const draw=(look,facing)=>{const c=Object.assign(document.createElement('canvas'),{width:80,height:96});spriteRenderer.drawPlayer(c.getContext('2d'),look,{x:40,y:88,facing},0);return c.toDataURL();};
          const views=[];
          for(const facing of ['down','left','up','right']){
            const base=draw(profile,facing),fresh=draw({},facing),hats=[];
            for(const headwear of ['cap','beanie','bucket','crown','headwrap']){
              const equipped=draw({...profile,headwear},facing),removed=draw({...profile,headwear:'none'},facing);
              hats.push({headwear,equippedDiffers:equipped!==base,restored:removed===base});
            }views.push({facing,freshMatches:fresh===base,hats});
          }return {profile:spriteRenderer.normalizeProfile({}),views};
        }''',BASE_LOOK)
        for field,value in BASE_LOOK.items():
            self.assertEqual(result['profile'][field],value,field)
        for view in result['views']:
            with self.subTest(facing=view['facing']):
                self.assertTrue(view['freshMatches'],'The implicit default must be the bald gray base')
                for hat in view['hats']:
                    self.assertTrue(hat['equippedDiffers'],hat)
                    self.assertTrue(hat['restored'],hat)

    def test_covering_hats_hide_the_hair_crown_instead_of_adding_a_second_head(self):
        results=self.page.evaluate('''profile=>{
          const draw=(look,facing)=>{const c=Object.assign(document.createElement('canvas'),{width:80,height:96});spriteRenderer.drawPlayer(c.getContext('2d'),look,{x:40,y:88,facing},0);return c.getContext('2d').getImageData(0,0,80,96).data;},results=[];
          for(const [direction,facing]of ['down','left','up','right'].entries())for(const headwear of ['cap','beanie','bucket','headwrap']){
            const bald=draw({...profile,headwear},facing),topRows=spriteManifest.baseAvatar.eyeY[direction]-2;
            for(const hairstyle of spriteRenderer.catalog.hairstyles){
              const withHair=draw({...profile,headwear,hairstyle:hairstyle.id},facing);let differences=0;
              for(let i=0;i<80*topRows*4;i++)if(withHair[i]!==bald[i])differences++;
              results.push({facing,headwear,hairstyle:hairstyle.id,differences});
            }
          }return results;
        }''',BASE_LOOK)
        self.assertEqual(len(results),128)
        for item in results:
            with self.subTest(facing=item['facing'],headwear=item['headwear'],hairstyle=item['hairstyle']):
                self.assertEqual(item['differences'],0,'Hair above the brim must be covered, including wide curls and buns')

    def test_walks_animate_continuously_without_head_morphs_or_torso_holes(self):
        results = self.page.evaluate('''profile=>{
          const scale=3,W=240,H=288;
          const hash=data=>{let h=2166136261;for(const byte of data)h=Math.imul(h^byte,16777619);return h>>>0;};
          const sample=(look,facing,phase)=>{
            const canvas=Object.assign(document.createElement('canvas'),{width:W,height:H}),g=canvas.getContext('2d');
            spriteRenderer.drawPlayer(g,look,{x:120,y:264,scale,facing,walking:true,phase},0);
            const pixels=g.getImageData(0,0,W,H).data,headEnd=(spriteManifest.baseAvatar.neck[['down','left','up','right'].indexOf(facing)]-1)*scale;
            let x1=W,x2=-1,y1=H,y2=-1,headX1=W,headX2=-1,headY1=H,headY2=-1,count=0;
            for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[(y*W+x)*4+3]>128){
              count++;x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);
              if(y<headEnd){headX1=Math.min(headX1,x);headX2=Math.max(headX2,x);headY1=Math.min(headY1,y);headY2=Math.max(headY2,y);}
            }
            let torsoMinimum=Infinity;
            for(let y=70*scale;y<77*scale;y++){
              let row=0;for(let x=35*scale;x<45*scale;x++)if(pixels[(y*W+x)*4+3]>128)row++;
              torsoMinimum=Math.min(torsoMinimum,row);
            }
            return {pixels,hash:hash(pixels),x1,x2,y1,y2,count,torsoMinimum,
              headWidth:headX2-headX1+1,headHeight:headY2-headY1+1};
          };
          const results=[];
          for(const [name,look]of [['bald gray base',profile],['custom trumpet',{...profile,accessory:'trumpet',shirt:'#69e0ff'}]])
            for(const facing of ['down','left','up','right']){
              const frames=Array.from({length:60},(_,slot)=>sample(look,facing,slot/60*Math.PI*2));
              const changes=frames.map((frame,i)=>{
                const next=frames[(i+1)%frames.length];let changed=0;
                for(let at=0;at<frame.pixels.length;at+=4)if([0,1,2,3].some(c=>frame.pixels[at+c]!==next.pixels[at+c]))changed++;
                return changed/Math.max(frame.count,next.count);
              });
              results.push({name,facing,distinctFrames:new Set(frames.map(f=>f.hash)).size,changes,
                frames:frames.map(({pixels,hash,...metrics})=>metrics)});
            }
          return results;
        }''', BASE_LOOK)
        self.assertEqual(len(results), 8)
        for item in results:
            with self.subTest(look=item['name'], facing=item['facing']):
                self.assertGreater(item['distinctFrames'], 12,
                                   'A stride must animate between the old six atlas poses')
                self.assertLess(max(item['changes']), .35,
                                'Adjacent rendered moments must not jump to unrelated poses')
                widths=[frame['headWidth'] for frame in item['frames']]
                self.assertLessEqual(max(widths)-min(widths), 1, 'Walking must preserve head proportions')
                for frame in item['frames']:
                    self.assertTrue(0<frame['x1']<frame['x2']<239)
                    self.assertTrue(0<frame['y1']<frame['y2']<287)
                    self.assertTrue(145<=frame['y2']-frame['y1']+1<=168, json.dumps(frame))
                    self.assertTrue(255<=frame['y2']<=266, 'Feet must stay near the gameplay ground anchor')
                    self.assertGreater(frame['count'], 3000, 'The character must not blink out')
                    self.assertGreaterEqual(frame['torsoMinimum'], 12, 'Swinging limbs must not erase torso rows')

    def test_all_nine_musicians_keep_visible_stable_costumes_while_walking(self):
        results = self.page.evaluate('''()=>{
          const people=['bach','mozart','beethoven','clara','joplin','ellington','ella','nina','miles'],results=[];
          for(const id of people)for(const facing of ['down','left','up','right']){
            const hashes=new Set(),widths=[],heights=[],counts=[];
            for(let slot=0;slot<30;slot++){
              const canvas=Object.assign(document.createElement('canvas'),{width:240,height:288}),g=canvas.getContext('2d');
              g.save();g.translate(120,264);g.scale(3,3);
              spriteRenderer.drawNPC(g,{id,x:0,y:0,facing,walking:true,phase:slot/30*Math.PI*2,activity:'wandering'},0);g.restore();
              const data=g.getImageData(0,0,240,288).data;let x1=240,y1=288,x2=-1,y2=-1,count=0,h=2166136261;
              for(let at=0;at<data.length;at+=4){
                if(data[at+3]>128){const x=at/4%240,y=Math.floor(at/4/240);x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);count++;}
                for(let c=0;c<4;c++)h=Math.imul(h^data[at+c],16777619);
              }
              hashes.add(h>>>0);widths.push(x2-x1+1);heights.push(y2-y1+1);counts.push(count);
            }
            results.push({id,facing,distinct:hashes.size,widths,heights,counts});
          }return results;
        }''')
        self.assertEqual(len(results),36)
        for item in results:
            with self.subTest(musician=item['id'],facing=item['facing']):
                self.assertGreater(item['distinct'], 8, 'Musicians must share the continuous walking path')
                self.assertGreater(min(item['counts']),2500, 'A costume must remain visible through the stride')
                self.assertLess(max(item['counts'])/min(item['counts']),1.3, 'Costumes must not flash or lose large pieces')
                self.assertLess(max(item['widths'])-min(item['widths']),20, 'No isolated wide squat pose')
                self.assertLess(max(item['heights'])-min(item['heights']),12, 'Stable world scale throughout the stride')

    def test_all_four_bald_heads_are_complete_and_rounded(self):
        results=self.page.evaluate('''profile=>['down','left','up','right'].map((facing,direction)=>{
          const c=Object.assign(document.createElement('canvas'),{width:80,height:96}),g=c.getContext('2d');spriteRenderer.drawPlayer(g,profile,{x:40,y:88,facing},0);
          const p=g.getImageData(0,0,80,96).data,neck=spriteManifest.baseAvatar.neck[direction];
          let top=96,topWidth=0,widest=0,warm=0,opaque=0,redCap=0;
          for(let y=0;y<neck;y++){
            let width=0;for(let x=0;x<80;x++){const at=(y*80+x)*4;if(p[at+3]>128)width++;}
            if(width&&top===96){top=y;topWidth=width;}widest=Math.max(widest,width);
          }
          for(let y=40;y<48;y++)for(let x=33;x<47;x++){const i=(y*80+x)*4,r=p[i],green=p[i+1],b=p[i+2];if(p[i+3]>128){opaque++;if(r>=green*.98&&green>b*1.02&&r>90)warm++;if(r>green*2&&r>b*2&&green<100&&r>120)redCap++;}}
          return {facing,top,topWidth,widest,warm,opaque,redCap};
        })''',BASE_LOOK)
        for item in results:
            with self.subTest(facing=item['facing']):
                self.assertGreater(item['top'],0)
                self.assertLess(item['topWidth'],item['widest']*.8,'Bare heads must have their full rounded scalp')
                self.assertGreater(item['opaque'],80,'There must be real scalp rather than a hole left by a removed cap')
                self.assertGreater(item['warm']/item['opaque'],.9,'The top of the bald head must contain skin, not hair or headwear')
                self.assertEqual(item['redCap'],0,'No red cap may remain baked into the bald base')

    def test_reduced_motion_freezes_the_rig_and_selected_emotes(self):
        result=self.page.evaluate('''async profile=>{
          const still=createCodaCharacterRenderer({reducedMotion:()=>true});await still.ready;
          const frames=[];
          for(const facing of ['down','left','up','right']){
            const outputs=[];
            for(let i=0;i<12;i++){
              const canvas=Object.assign(document.createElement('canvas'),{width:80,height:96});
              still.drawPlayer(canvas.getContext('2d'),{...profile,accessory:'trumpet'},
                {x:40,y:88,facing,walking:true,phase:i/12*Math.PI*2,emote:'dance',emoteTime:i/3},i);
              outputs.push(canvas.toDataURL());
            }frames.push(new Set(outputs).size);
          }return frames;
        }''',BASE_LOOK)
        self.assertEqual(result,[1,1,1,1],'Reduced motion must not leave joint transforms running')

    def test_held_instruments_remain_attached_through_every_direction(self):
        result=self.page.evaluate('''profile=>{
          const results=[];
          for(const facing of ['down','left','up','right'])for(const accessory of ['trumpet','microphone']){
            const distances=[],visible=[];
            for(let slot=0;slot<60;slot++){
              const make=()=>Object.assign(document.createElement('canvas'),{width:240,height:288});
              const body=make(),actual=make(),motion={x:120,y:264,scale:3,facing,walking:true,phase:slot/60*Math.PI*2};
              spriteRenderer.drawPlayer(body.getContext('2d'),{...profile,shirt:'#69e0ff',accessory:'none'},motion,0);
              spriteRenderer.drawPlayer(actual.getContext('2d'),{...profile,shirt:'#69e0ff',accessory},motion,0);
              const a=actual.getContext('2d').getImageData(0,0,240,288).data,b=body.getContext('2d').getImageData(0,0,240,288).data;
              let propX=0,propY=0,props=0;const hands=[];
              for(let y=190;y<285;y++)for(let x=35;x<205;x++){
                const at=(y*240+x)*4,r=b[at],g=b[at+1],blue=b[at+2];
                if(b[at+3]>128&&r>g*1.15&&g>blue*1.1&&r>90&&y<250)hands.push([x,y]);
                if(a[at+3]>128&&[0,1,2,3].some(c=>a[at+c]!==b[at+c])){propX+=x;propY+=y;props++;}
              }
              if(props&&hands.length){propX/=props;propY/=props;distances.push(Math.min(...hands.map(([x,y])=>Math.hypot(x-propX,y-propY))));}
              visible.push(props);
            }results.push({facing,accessory,distances,visible});
          }return results;
        }''',BASE_LOOK)
        for item in result:
            with self.subTest(facing=item['facing'],accessory=item['accessory']):
                self.assertEqual(len(item['distances']),60,'Each render must include a hand and instrument')
                self.assertGreater(min(item['visible']),10,'The held instrument must not disappear')
                self.assertLess(max(item['distances']),40,'The instrument must stay beside its visible hand')
                self.assertLess(max(item['distances'])-min(item['distances']),8,
                                'A held instrument must follow its arm rather than drifting independently')

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
        }''', BASE_LOOK)
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
        }''', BASE_LOOK)
        normal, preview = result['normal'], result['preview']
        self.assertEqual(normal['height'], 53)
        self.assertEqual(preview['height'], 106)
        self.assertEqual(normal['maxY'], 179)
        self.assertEqual(preview['maxY'], normal['maxY'], 'Scaling must retain the same gameplay foot anchor')
        self.assertGreater(preview['count'], normal['count'] * 3)
        self.assertLess(preview['minY'], normal['minY'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
