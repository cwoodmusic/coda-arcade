"""Shared world defaults, local-save priority, and lifted-object layer masks.

Runs against disposable browser contexts and the checked-in project export.
No account credentials, external services, or existing browser saves are used.
"""
import copy
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
EXPORT_FINGERPRINT='0050f10cb074abc858aa05827b38767597597f2e260c0b99f45abb14d1de6786'
BLANK={'format':'CodaArcadeWorldProject','version':1,
       'world':{'width':1672,'height':941},'assets':[],'collision':[],'strokes':[]}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass


class PublishedWorldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.published=json.loads((ROOT/'published-world-project.json').read_text())
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),
            functools.partial(QuietHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/world-preview.html'
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(
            executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop()
        cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1600,'height':1000})
        self.context.route('https://**/*',lambda route:route.abort())
        self.context.add_init_script('''(()=>{
          localStorage.setItem('codaArcadeFXV1','off');
          window.publishFrames=count=>new Promise(resolve=>{
            const next=()=>{if(--count<=0)resolve();else requestAnimationFrame(next);};
            requestAnimationFrame(next);
          });
        })()''')
        self.page=self.context.new_page();self.page.set_default_timeout(8000)
        self.errors=[];self.failures=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.on('console',lambda message:self.errors.append(message.text)
                     if 'Arcade frame error:' in message.text else None)
        self.page.on('response',lambda response:self.failures.append(response.url)
                     if response.status>=400 and '127.0.0.1' in response.url
                     and not response.url.endswith('favicon.ico') else None)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors,[],'Published project must not cause frame/page errors')
        self.assertEqual(self.failures,[],'Failed local project/artwork responses')

    def load(self,local=None,invalid_published=False):
        if local is not None:
            self.context.add_init_script('''(()=>{
              if(location.protocol!=='http:'||sessionStorage.getItem('projectFixtureSeeded'))return;
              localStorage.setItem('codaWorldProjectV1',JSON.stringify(%s));
              sessionStorage.setItem('projectFixtureSeeded','yes');
            })()'''%json.dumps({**local,'savedAt':12345}))
        if invalid_published:
            self.context.route('**/published-world-project.json*',
                lambda route:route.fulfill(status=200,content_type='application/json',
                                          body='{"format":"unsupported project"}'))
        self.page.goto(self.url,wait_until='domcontentloaded')
        self.page.wait_for_function('window.CodaDeveloperConsole?.ready()&&window.CodaArcadeQA?.characters().spriteState.ready')
        self.page.evaluate('publishFrames(3)')

    def project(self):
        return self.page.evaluate('CodaDeveloperConsole.getProject()')

    def reload(self):
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole.ready()&&CodaArcadeQA.characters().spriteState.ready')
        self.page.evaluate('publishFrames(3)')

    def pixel(self,name,x,y,part='above'):
        return self.page.evaluate('''([name,x,y,part])=>
          CodaArcadeQA.liftedObjectPixel(name,x,y,part)''',[name,x,y,part])

    def map_click(self,x,y):
        point=self.page.evaluate('''([x,y])=>{
          const box=document.querySelector('#view').getBoundingClientRect(),cam=CodaArcadeQA.camera();
          return {x:box.left+(x-cam.x)*cam.zoom*box.width/1672,
                  y:box.top+(y-cam.y)*cam.zoom*box.height/941};
        }''',[x,y])
        self.page.mouse.click(**point)

    def open_tab(self,name):
        self.page.evaluate('(name)=>CodaDeveloperConsole.open(name)',name)

    def field(self,name,value):
        target=self.page.locator('#'+name);target.fill(str(value));target.press('Tab')

    def test_fresh_browser_gets_the_exact_export_and_current_play_controls(self):
        canonical=json.dumps(self.published,sort_keys=True,separators=(',',':')).encode()
        self.assertEqual(hashlib.sha256(canonical).hexdigest(),EXPORT_FINGERPRINT,
                         'Publish the supplied world data without silently rewriting edits')
        self.load();self.assertEqual(self.project(),self.published)
        self.assertEqual((len(self.published['assets']),len(self.published['collision']),
                          len(self.published['strokes'])),(8,242,11))
        games=self.page.evaluate('''()=>CodaArcadeQA.worldObjects().filter(x=>x.game).map(x=>({
          name:x.game.name,walkable:CodaArcadeQA.walkable(x.game.npcX??x.game.x,x.game.npcY??x.game.y),
          route:CodaArcadeQA.route(1180,388,x.game.x,x.game.y).length
        }))''')
        self.assertEqual({game['name'] for game in games},
                         {'Pitch Race','Music Triad','Rhythm Room','Song Machine'})
        self.assertTrue(all(game['walkable'] and game['route']>0 for game in games),games)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().spriteState.mode'),
                         'javascript-characters')
        self.assertTrue(self.page.evaluate('CodaArcadeQA.place(950,420)'))
        self.page.locator('#view').focus()
        before=self.page.evaluate('CodaArcadeQA.characters().player')
        self.page.keyboard.down('d');self.page.evaluate('publishFrames(8)');self.page.keyboard.up('d')
        after=self.page.evaluate('CodaArcadeQA.characters().player')
        self.assertGreater(after['x'],before['x']+10)
        self.page.keyboard.press('Space')
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>3')
        self.page.wait_for_function('!CodaArcadeQA.characters().player.airborne')
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().player.jumps'),before['jumps']+1)
        self.assertIsNone(self.page.evaluate('localStorage.getItem("codaWorldProjectV1")'),
                          'Simply visiting a published world must not create a local override')
        stored=self.page.evaluate('''()=>new Promise((resolve,reject)=>{
          const open=indexedDB.open('codaArcadeAssetStudioDB',1);
          open.onerror=()=>reject(open.error);open.onsuccess=()=>{
            const db=open.result,request=db.transaction('layouts','readonly').objectStore('layouts').get('codaWorldProjectV1');
            request.onsuccess=()=>{resolve(request.result??null);db.close();};request.onerror=()=>reject(request.error);
          };
        })''')
        self.assertIsNone(stored,'A fresh visit must keep receiving future published updates')
        self.reload();self.assertEqual(self.project(),self.published)

    def test_existing_local_project_wins_over_the_shared_default(self):
        private=copy.deepcopy(self.published)
        private['assets'][0]['name']='My private lounge sofa'
        private['assets'][0]['x']+=24
        self.load(local=private);self.assertEqual(self.project(),private)
        self.reload();self.assertEqual(self.project(),private)

    def test_movement_and_jump_wait_for_the_published_collision_map(self):
        pending=[]
        self.context.route('**/published-world-project.json*',lambda route:pending.append(route))
        self.page.goto(self.url,wait_until='domcontentloaded')
        self.page.wait_for_function('window.CodaDeveloperConsole&&!CodaDeveloperConsole.ready()&&window.CodaArcadeQA')
        self.assertEqual(len(pending),1)
        before=self.page.evaluate('CodaArcadeQA.characters().player')
        self.page.locator('#view').focus();self.page.keyboard.down('d')
        self.page.keyboard.press('Space');self.page.evaluate('publishFrames(8)')
        self.page.keyboard.up('d')
        waiting=self.page.evaluate('CodaArcadeQA.characters().player')
        self.assertEqual([waiting['x'],waiting['y'],waiting['jumps'],waiting['jumpHeight']],
                         [before['x'],before['y'],before['jumps'],0])
        pending[0].fulfill(status=200,content_type='application/json',body=json.dumps(self.published))
        self.page.wait_for_function('CodaDeveloperConsole.ready()')
        self.page.evaluate('publishFrames(3)');self.assertEqual(self.project(),self.published)
        self.assertTrue(self.page.evaluate('CodaArcadeQA.place(950,420)'))
        self.page.keyboard.press('Space')
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>3')

    def test_an_explicit_empty_local_project_is_preserved(self):
        self.load(local=BLANK);self.assertEqual(self.project(),BLANK)
        self.reload();self.assertEqual(self.project(),BLANK)

    def test_reset_restores_published_defaults_and_undo_keeps_the_local_project(self):
        self.load(local=BLANK);self.open_tab('project')
        self.page.once('dialog',lambda dialog:dialog.accept())
        self.page.locator('#devReset').click()
        self.assertEqual(self.project(),self.published)
        self.page.locator('#devUndo').click();self.assertEqual(self.project(),BLANK)
        self.page.locator('#devRedo').click();self.assertEqual(self.project(),self.published)
        self.assertTrue(self.page.evaluate('CodaDeveloperConsole.save()'))
        self.reload();self.assertEqual(self.project(),self.published)

    def test_invalid_published_data_does_not_replace_a_valid_local_project(self):
        self.load(local=BLANK,invalid_published=True)
        self.assertEqual(self.project(),BLANK)
        status=self.page.locator('#devStatus').inner_text().lower()
        self.assertIn('published',status)
        self.assertTrue(any(word in status for word in ['invalid','unavailable','failed','could not load']),status)
        self.assertTrue(self.page.evaluate('CodaArcadeQA.characters().spriteState.ready'))

    def test_erased_lifted_pixels_stay_visible_behind_actors_instead_of_occluding_them(self):
        self.load()
        for name,x,y,rgba in [
            ('boutique_mirror',619,406,[49,168,249,255]),
            ('lounge_center_candle_table',285,246,[230,104,26,255])]:
            with self.subTest(object=name):
                self.assertEqual(self.pixel(name,x,y,'raw'),rgba)
                self.assertEqual(self.pixel(name,x,y,'behind'),rgba,
                                 'Erasure changes occlusion, not the visible object artwork')
                self.assertEqual(self.pixel(name,x,y,'above')[3],0,
                                 'Lifted objects must not repaint erased pixels over characters')
        # Cabinet cutouts come from the world image rather than foregroundParts.
        # They must use the same erasure partition as the furniture cutouts.
        for name in ['cabinet_pitch_race','cabinet_music_triad']:
            candidate=self.page.evaluate('''name=>{
              const a=CodaDeveloperConsole.getProject().assets.find(x=>x.origin?.name===name),[bx,by,w,h]=a.origin.bounds;
              for(let y=by+70;y<by+h;y++)for(let x=bx;x<bx+w;x++){
                const raw=CodaArcadeQA.liftedObjectPixel(name,x,y,'raw'),above=CodaArcadeQA.liftedObjectPixel(name,x,y,'above');
                if(raw?.[3]>200&&above?.[3]===0)return [x,y,raw];
              }return null;
            }''',name)
            self.assertIsNotNone(candidate,name+' must exercise a real erased cabinet pixel')
            self.assertEqual(self.pixel(name,candidate[0],candidate[1],'behind'),candidate[2])

    def test_masks_follow_world_strokes_and_refresh_after_transform_and_undo(self):
        self.load();self.open_tab('objects')
        self.page.locator('#assetList').select_option('asset-4')
        original=next(x for x in self.published['assets'] if x['id']=='asset-4')
        raw=self.pixel('boutique_mirror',619,406,'raw')
        self.field('assetX',original['x']+160);self.field('assetY',original['y']+80)
        self.field('assetW',original['w']*2);self.field('assetRotate',25)
        self.page.evaluate('publishFrames(3)')
        self.assertEqual(self.pixel('boutique_mirror',619,406,'above'),raw,
                         'Moving away from a world-space erasure must restore that source pixel')
        self.assertEqual(self.pixel('boutique_mirror',619,406,'behind')[3],0)
        destination=self.page.evaluate('''()=>{
          const a=CodaDeveloperConsole.getProject().assets.find(x=>x.id==='asset-4'),[bx,by,w,h]=a.origin.bounds;
          const dx=((619.5-bx)/w-.5)*a.w,dy=((406.5-by)/h-.5)*a.h,angle=a.rotation*Math.PI/180;
          return [a.x+dx*Math.cos(angle)-dy*Math.sin(angle),a.y+dx*Math.sin(angle)+dy*Math.cos(angle)];
        }''')
        self.open_tab('layers');self.page.locator('#devLayerTool').select_option('erase')
        self.page.locator('#devLayerSize').select_option('8')
        self.map_click(*destination)
        self.page.wait_for_function('CodaDeveloperConsole.getProject().strokes.length===12')
        self.page.evaluate('publishFrames(3)')
        self.assertEqual(self.pixel('boutique_mirror',619,406,'above')[3],0)
        self.assertEqual(self.pixel('boutique_mirror',619,406,'behind'),raw)
        self.page.locator('#devUndo').click();self.page.evaluate('publishFrames(3)')
        self.assertEqual(self.pixel('boutique_mirror',619,406,'above'),raw,
                         'Undo must invalidate the masked image cache')
        self.page.locator('#devRedo').click();self.page.evaluate('publishFrames(3)')
        self.assertEqual(self.pixel('boutique_mirror',619,406,'above')[3],0)

    def test_actor_remains_visible_in_front_of_erased_mirror_art(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.load();self.open_tab('collision')
        self.page.get_by_label('Collision tool',exact=True).select_option('open')
        self.page.get_by_label('Collision brush',exact=True).select_option('3')
        self.map_click(619,447)
        self.assertTrue(self.page.evaluate('CodaArcadeQA.place(619,447)'))
        self.page.locator('#view').focus();self.page.keyboard.press('F2')
        self.page.evaluate('publishFrames(3)')
        result=self.page.evaluate('''()=>{
          const qa=CodaArcadeQA,player=qa.characters().player,reference=document.createElement('canvas');
          reference.width=100;reference.height=100;
          const ctx=reference.getContext('2d'),renderer=createCodaCharacterRenderer({reducedMotion:()=>true});
          renderer.drawPlayer(ctx,player.appearance,{x:50,y:80,facing:player.facing},0);
          const camera=qa.camera(),canvas=document.querySelector('#view');
          return {expected:Array.from(ctx.getImageData(50,39,1,1).data),
            actual:Array.from(canvas.getContext('2d').getImageData(
              Math.round((619-camera.x)*camera.zoom),Math.round((406-camera.y)*camera.zoom),1,1).data),
            mirror:qa.liftedObjectPixel('boutique_mirror',619,406,'raw')};
        }''')
        self.assertEqual(result['expected'][3],255,'The witness must intersect opaque character art')
        self.assertNotEqual(result['expected'],result['mirror'])
        self.assertEqual(result['actual'],result['expected'],
                         'The world draw pass must not cover the player with erased mirror pixels')

    def test_live_cabinet_effects_stay_behind_actors_in_erased_screen_pixels(self):
        local=copy.deepcopy(self.published)
        # Cover the complete Pitch Race screen so live notes and bloom must
        # follow the same background partition as its static source pixels.
        local['strokes'].append({'tool':'erase','size':1,'depth':300,
            'points':[[x,y] for y in range(207,252) for x in range(696,748)]})
        self.page.emulate_media(reduced_motion='reduce')
        self.load(local=local)
        self.page.locator('#fxBtn').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.atmosphere().quality'),'full')
        self.open_tab('collision')
        self.page.get_by_label('Collision tool',exact=True).select_option('open')
        self.page.get_by_label('Collision brush',exact=True).select_option('5')
        self.map_click(722,265)
        self.assertTrue(self.page.evaluate('CodaArcadeQA.place(722,265)'))
        # The layer pane suppresses the nearby cabinet prompt and freezes
        # movement while leaving live cabinet effects running at full quality.
        self.open_tab('layers')
        self.assertEqual(self.pixel('cabinet_pitch_race',722,224,'above')[3],0)
        result=self.page.evaluate('''async()=>{
          const qa=CodaArcadeQA,player=qa.characters().player,reference=document.createElement('canvas');
          reference.width=100;reference.height=100;
          const ctx=reference.getContext('2d'),renderer=createCodaCharacterRenderer({reducedMotion:()=>true});
          renderer.drawPlayer(ctx,player.appearance,{x:50,y:80,facing:player.facing},0);
          const expected=ctx.getImageData(38,36,25,23).data,liveFrames=new Set();
          const canvas=document.querySelector('#view'),world=canvas.getContext('2d');
          const failures=[];let compared=0;
          for(let frame=0;frame<8;frame++){
            await publishFrames(6);
            const cam=qa.camera();
            const actual=world.getImageData(Math.round((710-cam.x)*cam.zoom),Math.round((221-cam.y)*cam.zoom),25,23).data;
            for(let at=0;at<expected.length;at+=4)if(expected[at+3]===255){
              compared++;
              if(expected.subarray(at,at+4).some((value,i)=>value!==actual[at+i])&&failures.length<8)
                failures.push({frame,x:710+(at/4)%25,y:221+Math.floor(at/4/25),
                  expected:Array.from(expected.subarray(at,at+4)),actual:Array.from(actual.subarray(at,at+4))});
            }
            liveFrames.add(Array.from(world.getImageData(698,210,10,40).data).join(','));
          }
          return {failures,compared,liveVariations:liveFrames.size};
        }''')
        self.assertGreater(result['compared'],1000,'Exercise opaque head pixels across multiple live frames')
        self.assertGreater(result['liveVariations'],1,'Full-quality cabinet effects must actually animate')
        self.assertEqual(result['failures'],[],
                         'Animated cabinet screen effects must not repaint erased pixels over the player')


if __name__=='__main__':
    unittest.main(verbosity=2)
