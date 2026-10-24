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
