"""Real phone touch, camera, pinch, room routing and saved-world checks."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

class MobileWorldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop();cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        self.context.route('https://**/*',lambda route:route.abort())
        self.context.add_init_script("localStorage.setItem('codaArcadeFXV1','off')")
        self.page=self.context.new_page();self.page.set_default_timeout(10000)
        self.errors=[];self.failures=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.on('console',lambda message:self.errors.append(message.text) if 'Arcade frame error:' in message.text else None)
        self.page.on('response',lambda response:self.failures.append(response.url)
          if response.status>=400 and '127.0.0.1' in response.url and not response.url.endswith('favicon.ico') else None)
        self.url=f'http://127.0.0.1:{self.server.server_port}/world-preview.html'
        self.load();self.cdp=self.context.new_cdp_session(self.page)

    def tearDown(self):
        self.context.close();self.assertEqual(self.errors,[]);self.assertEqual(self.failures,[])

    def load(self):
        self.page.goto(self.url,wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole?.ready()&&CodaArcadeQA?.touch()?.mobile')

    def touch(self):
        return self.page.evaluate('CodaArcadeQA.touch()')

    def position(self):
        return self.page.evaluate('CodaArcadeQA.position()')

    def touches(self,kind,*points):
        self.cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':list(points)})

    def button_point(self,label,touch_id):
        box=self.page.locator('#codaTouchControls').get_by_role('button',name=label,exact=True).bounding_box()
        self.assertIsNotNone(box,label)
        return {'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':touch_id,'radiusX':3,'radiusY':3,'force':1}

    def menu(self,selector):
        self.page.locator('#worldMenuBtn').tap()
        self.page.locator(selector).tap()

    def place(self,x,y):
        self.assertTrue(self.page.evaluate('([x,y])=>CodaArcadeQA.place(x,y)',[x,y]))
        self.page.wait_for_timeout(70)

    def screen_position(self):
        return self.page.evaluate('''()=>{
          const canvas=view.getBoundingClientRect(),stage=worldStage.getBoundingClientRect(),camera=CodaArcadeQA.camera(),p=CodaArcadeQA.position();
          const scale=camera.zoom*canvas.width/1672;
          return {x:canvas.left+(p.x-camera.x)*scale,y:canvas.top+(p.y-camera.y)*scale,
            head:canvas.top+(p.y-camera.y-58)*scale,stage:stage.toJSON(),width:innerWidth,scrollWidth:document.documentElement.scrollWidth};
        }''')

    def floor_point(self,dx=120,dy=0,touch_id=1):
        """A visible floor position relative to the camera-followed player."""
        player=self.screen_position()
        return {'x':max(20,min(player['width']-20,player['x']+dx)),
          'y':player['y']+dy,'id':touch_id,'radiusX':3,'radiusY':3,'force':1}

    def settle_camera(self):
        # Teleportation eases the camera. Wait for it before choosing a held
        # screen-space target, as a player would after looking around.
        self.page.evaluate('window.__mobileCameraCheck=null')
        self.page.wait_for_function('''()=>{
          const camera=CodaArcadeQA.camera(),last=window.__mobileCameraCheck;
          const stable=last&&Math.hypot(camera.x-last.x,camera.y-last.y)<.001?(last.stable+1):0;
          window.__mobileCameraCheck={x:camera.x,y:camera.y,stable};return stable>=3;
        }''')

    def assert_finger_stopped(self):
        self.page.wait_for_function('!CodaArcadeQA.fingerWalk().following')
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.fingerWalk().target'))
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.characters().player.destination'))
        self.page.wait_for_timeout(80)
        position=self.position();self.page.wait_for_timeout(140)
        self.assertEqual(self.position(),position,'Lifting the finger must stop movement rather than finish a path')

    def assert_avatar_visible(self):
        self.page.wait_for_function('''()=>{
          const canvas=view.getBoundingClientRect(),stage=worldStage.getBoundingClientRect(),camera=CodaArcadeQA.camera(),p=CodaArcadeQA.position(),scale=camera.zoom*canvas.width/1672;
          const x=canvas.left+(p.x-camera.x)*scale,y=canvas.top+(p.y-camera.y)*scale;
          return x>=stage.left+4&&x<=stage.right-4&&y>=stage.top+8&&y<=stage.bottom-4;
        }''')
        actual=self.screen_position();stage=actual['stage']
        self.assertGreaterEqual(actual['x'],stage['left']+3)
        self.assertLessEqual(actual['x'],stage['right']-3)
        self.assertGreaterEqual(actual['y'],stage['top']+7)
        self.assertLessEqual(actual['y'],stage['bottom']-3)
        self.assertGreaterEqual(actual['head'],stage['top']-3,'The player’s head must not disappear above the crop')
        self.assertLessEqual(actual['scrollWidth'],actual['width']+1,'The cropped world must not widen the page')

    def test_phone_camera_follows_the_player_at_both_world_edges_and_after_rotation(self):
        self.assertTrue(self.touch()['visible']);self.assert_avatar_visible()
        edge_points=self.page.evaluate('''()=>{
          const points=[];for(let y=185;y<=835;y+=10)for(let x=65;x<=1585;x+=10)if(CodaArcadeQA.walkable(x,y))points.push({x,y});
          const left=points.reduce((a,p)=>p.x<a.x?p:a),right=points.reduce((a,p)=>p.x>a.x?p:a);
          const north=points.reduce((a,p)=>p.y<a.y?p:a),south=points.reduce((a,p)=>p.y>a.y?p:a);
          return [left,right,north,south];
        }''')
        for viewport in [{'width':390,'height':844},{'width':844,'height':390}]:
            self.page.set_viewport_size(viewport);self.page.wait_for_timeout(150)
            for point in edge_points:
                with self.subTest(viewport=viewport,point=point):
                    self.place(point['x'],point['y']);self.assert_avatar_visible()

    def test_large_controls_overlay_the_full_height_world_in_portrait_and_landscape(self):
        for viewport in [{'width':390,'height':844},{'width':360,'height':780},{'width':844,'height':390},{'width':667,'height':375}]:
            self.page.set_viewport_size(viewport);self.page.wait_for_timeout(100)
            metric=self.page.evaluate('''()=>{
              const host=document.querySelector('#codaTouchControls'),dpad=host.querySelector('.coda-dpad').getBoundingClientRect(),actions=host.querySelector('.coda-touch-actions').getBoundingClientRect(),stage=worldStage.getBoundingClientRect();
              return {stageBottom:stage.bottom,scrollWidth:document.documentElement.scrollWidth,
                reserve:getComputedStyle(document.body).getPropertyValue('--coda-world-pad-height').trim(),
                dpad:dpad.toJSON(),actions:actions.toJSON(),
                center:document.elementFromPoint((dpad.right+actions.left)/2,innerHeight-45)?.id,
                buttons:[...host.querySelectorAll('button')].filter(button=>!button.hidden).map(button=>{const b=button.getBoundingClientRect();return {width:b.width,height:b.height};})};
            }''')
            self.assertEqual(metric['reserve'],'0px');self.assertAlmostEqual(metric['stageBottom'],viewport['height'],delta=1)
            self.assertLessEqual(metric['scrollWidth'],viewport['width']+1)
            self.assertGreaterEqual(metric['dpad']['left'],0);self.assertLess(metric['dpad']['right'],metric['actions']['left']);self.assertLessEqual(metric['actions']['right'],viewport['width'])
            self.assertTrue(all(button['width']>=58 and button['height']>=58 for button in metric['buttons']),metric)
            self.assertEqual(metric['center'],'view','The space between the thumb controls must remain a playable map')

    def test_held_floor_finger_redirects_with_drag_and_stops_on_lift_without_a_path(self):
        self.place(1225,675);self.assert_avatar_visible();self.settle_camera();start=self.position();right=self.floor_point()
        self.touches('touchStart',right)
        self.page.wait_for_function('x=>CodaArcadeQA.fingerWalk().following&&CodaArcadeQA.position().x>x+18',arg=start['x'])
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.characters().player.destination'))
        redirect=self.position();left=self.floor_point(-120)
        self.touches('touchMove',left)
        self.page.wait_for_function('x=>CodaArcadeQA.position().x<x-18',arg=redirect['x'])
        self.assertLess(self.page.evaluate('CodaArcadeQA.fingerWalk().target.clientX'),100)
        self.touches('touchEnd');self.assert_finger_stopped()

    def test_floor_finger_cancel_and_rotation_stop_until_a_new_gesture(self):
        self.place(1225,675);self.assert_avatar_visible();self.settle_camera();right=self.floor_point();start=self.position()
        self.touches('touchStart',right);self.page.wait_for_function('x=>CodaArcadeQA.position().x>x+10',arg=start['x'])
        self.touches('touchCancel');self.assert_finger_stopped()
        start=self.position();right=self.floor_point();self.touches('touchStart',right)
        self.page.wait_for_function('x=>CodaArcadeQA.position().x>x+10',arg=start['x'])
        self.page.set_viewport_size({'width':844,'height':390});self.assert_finger_stopped();self.touches('touchEnd')
        self.assert_avatar_visible();self.settle_camera();start=self.position();left=self.floor_point(-120)
        self.touches('touchStart',left);self.page.wait_for_function('x=>CodaArcadeQA.fingerWalk().following&&CodaArcadeQA.position().x<x-12',arg=start['x'])
        self.touches('touchEnd');self.assert_finger_stopped()

    def test_floor_finger_and_jump_button_work_together_without_losing_steering(self):
        self.place(1225,675);self.assert_avatar_visible();self.settle_camera();start=self.position();right=self.floor_point()
        self.touches('touchStart',right);self.page.wait_for_function('x=>CodaArcadeQA.position().x>x+10',arg=start['x'])
        jump=self.button_point('Jump',2);self.touches('touchStart',right,jump)
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>6')
        self.assertTrue(self.page.evaluate('CodaArcadeQA.fingerWalk().following'))
        self.assertEqual(self.page.evaluate('CodaArcadeQA.fingerWalk().pointerCount'),1)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().player.jumps'),1)
        jumping=self.position();self.touches('touchEnd',jump)
        self.page.wait_for_function('x=>CodaArcadeQA.position().x>x+12',arg=jumping['x'])
        self.touches('touchEnd');self.assert_finger_stopped()

    def test_held_floor_finger_respects_a_painted_collision_wall(self):
        # A saved, explicitly painted barrier must block direct touch movement.
        # Keep it long enough that a held finger cannot drift around its ends.
        self.page.evaluate('''()=>{
          const project=CodaDeveloperConsole.getProject(),grid=CodaArcadeQA.collisionGrid(),cells=new Map(project.collision);
          for(let row=59;row<=77;row++)cells.set(row*grid.width+126,0);
          project.collision=[...cells];localStorage.setItem('codaWorldProjectV1',JSON.stringify(project));
        }''')
        self.load();self.place(1225,675);self.assert_avatar_visible();self.settle_camera()
        self.assertFalse(self.page.evaluate('CodaArcadeQA.walkable(1265,675)'))
        right=self.floor_point();self.touches('touchStart',right)
        self.page.wait_for_function('CodaArcadeQA.position().x>1245')
        self.page.wait_for_timeout(250);blocked=self.position();self.page.wait_for_timeout(350)
        self.assertLess(blocked['x'],1260);self.assertAlmostEqual(self.position()['x'],blocked['x'],delta=.01)
        self.assertTrue(self.page.evaluate('p=>CodaArcadeQA.walkable(p.x,p.y)',self.position()))
        self.assertTrue(self.page.evaluate('CodaArcadeQA.fingerWalk().following'))
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.characters().player.destination'))
        self.touches('touchEnd');self.assert_finger_stopped()

    def test_two_fingers_can_walk_and_jump_then_release_without_stuck_movement(self):
        self.place(1225,675);self.assert_avatar_visible()
        right=self.button_point('Move right',1);jump=self.button_point('Jump',2);start=self.position()
        self.touches('touchStart',right)
        self.page.wait_for_function('x=>CodaArcadeQA.position().x>x+12',arg=start['x'])
        self.touches('touchStart',right,jump)
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>6')
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().player.jumps'),1)
        self.touches('touchEnd',right);self.page.wait_for_timeout(90)
        self.assertGreater(self.position()['x'],start['x']+15)
        self.touches('touchEnd');self.page.wait_for_timeout(100)
        stop=self.position();self.page.wait_for_timeout(130)
        self.assertEqual(self.position(),stop);self.assertEqual(self.touch()['held'],[])
        self.assertFalse(self.page.evaluate('CodaArcadeQA.characters().player.walking'))

    def test_diagonal_cancel_and_rotation_clear_all_held_touch_directions(self):
        self.place(1225,675);diagonal=self.button_point('Move up right',1);start=self.position()
        self.touches('touchStart',diagonal)
        self.page.wait_for_function('p=>CodaArcadeQA.position().x>p.x+10&&CodaArcadeQA.position().y<p.y-10',arg=start)
        self.touches('touchCancel');self.page.wait_for_timeout(70)
        self.assertEqual(self.touch()['held'],[])
        right=self.button_point('Move right',1);self.touches('touchStart',right)
        self.page.wait_for_timeout(60);self.page.set_viewport_size({'width':844,'height':390})
        self.page.wait_for_function('CodaArcadeQA.touch().held.length===0')
        self.touches('touchEnd');self.page.wait_for_timeout(80)
        stop=self.position();self.page.wait_for_timeout(150);self.assertEqual(self.position(),stop)
        self.assert_avatar_visible()

    def test_real_pinch_changes_camera_zoom_without_leaving_a_walk_destination(self):
        self.place(1225,675);self.assert_avatar_visible()
        box=self.page.locator('#worldStage').bounding_box();y=box['y']+box['height']*.4
        points=[{'x':box['x']+130,'y':y,'id':1},{'x':box['x']+260,'y':y,'id':2}]
        before=self.page.evaluate('CodaArcadeQA.camera().targetZoom')
        self.touches('touchStart',*points)
        self.touches('touchMove',{**points[0],'x':box['x']+90},{**points[1],'x':box['x']+300})
        self.page.wait_for_function('before=>CodaArcadeQA.camera().targetZoom>before+.3',arg=before)
        self.touches('touchEnd');self.page.wait_for_timeout(100)
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.characters().player.destination'))
        self.assertEqual(self.touch()['held'],[]);self.assert_avatar_visible()

    def test_touch_menu_purchases_and_text_entry_preserve_outfit_currency_and_position(self):
        self.menu('#notesBtn');self.page.wait_for_function('!CodaArcadeQA.touch().visible')
        self.page.locator('[data-shop-item="witch"] button').tap()
        self.page.locator('[data-shop-item="witch"] button').tap()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),70)
        self.page.locator('#panelClose').tap();self.page.wait_for_function('CodaArcadeQA.touch().visible')
        before=self.position();self.menu('#avatarBtn')
        name=self.page.get_by_label('Arcade nickname',exact=True);name.fill('Touch Musician')
        name.press('w');self.assertEqual(self.position(),before)
        self.assertFalse(self.touch()['visible'])
        self.page.locator('#boutiqueSave').tap();self.load()
        appearance=self.page.evaluate('CodaArcadeQA.characters().player.appearance')
        self.assertEqual(appearance['headwear'],'witch');self.assertIn('Touch Musician',appearance['name'])
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),70)

    def test_pad_routes_into_rooms_hides_for_books_and_cabinets_and_returns_to_world(self):
        main=self.position();self.menu('#pianoLabBtn')
        self.page.wait_for_function('CodaArcadeQA.touch().context==="piano"&&CodaArcadeQA.touch().visible')
        start=self.page.evaluate('CodaArcadeQA.piano().player.y');down=self.button_point('Move down',1)
        self.touches('touchStart',down);self.page.wait_for_function('y=>CodaArcadeQA.piano().player.y>y+8',arg=start)
        self.touches('touchEnd');self.assertEqual(self.position(),main)
        self.assertTrue(self.page.locator('#codaTouchControls [data-action="emote"]').is_hidden())
        self.page.locator('[data-piano-view="games"]').tap();self.page.wait_for_function('!CodaArcadeQA.touch().visible')
        self.page.locator('#closepiano').tap();self.page.wait_for_function('CodaArcadeQA.touch().context==="world"')
        self.menu('#classroomBtn');self.page.wait_for_function('CodaArcadeQA.touch().context==="classroom"&&CodaArcadeQA.touch().visible')
        self.assertTrue(self.page.locator('#codaTouchControls [data-action="jump"]').is_hidden())
        self.page.locator('[data-classroom-view="books"]').tap();self.page.wait_for_function('!CodaArcadeQA.touch().visible')
        self.page.locator('#classroomSearch').fill('interval');self.page.locator('[data-topic="intervals"]').tap()
        self.assertIn('Intervals',self.page.locator('#classroomBookTitle').inner_text())
        self.page.locator('#classroomClose').tap();self.page.wait_for_function('CodaArcadeQA.touch().context==="world"')
        game=self.page.evaluate('CodaArcadeQA.worldObjects().find(object=>object.game?.index===3).game')
        self.place(game['x'],game['y']);self.page.locator('#codaTouchControls [data-action="interact"]').tap()
        self.page.wait_for_function('CodaArcadeQA.menu().gameOpen');self.page.wait_for_function('!CodaArcadeQA.touch().visible')
        self.assertIn('song-machine',self.page.locator('#gameiframe').get_attribute('src'))
        self.page.frame_locator('#gameiframe').locator('#add').wait_for()
        self.page.locator('#returnworld').tap();self.page.wait_for_function('CodaArcadeQA.touch().visible')
        self.assertEqual(self.touch()['context'],'world');self.assertEqual(self.touch()['held'],[])

if __name__=='__main__':unittest.main(verbosity=2)
