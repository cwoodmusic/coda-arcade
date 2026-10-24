"""Piano Lab regression checks using its real DOM, animation, and Web Audio."""
from pathlib import Path
import base64
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TWINKLE = [0,0,7,7,9,9,7,5,5,4,4,2,2,0,7,7,5,5,4,4,2,7,7,5,5,4,4,2,0,0,7,7,9,9,7,5,5,4,4,2,2,0]


class PianoLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1300,'height':1100})
        self.page = self.context.new_page(); self.page.set_default_timeout(10000)
        self.errors = []
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))
        self.page.set_content('<button id="returnFocus">Enter lab</button><section id="pianoroom" hidden></section>')
        self.page.add_style_tag(path=str(ROOT/'piano-lab.css'))
        self.page.add_script_tag(path=str(ROOT/'character-renderer.js'))
        self.page.add_script_tag(path=str(ROOT/'piano-lab.js'))
        self.page.evaluate('''()=>{
          const entries=new Map();window.rewards=[];window.exits=0;
          window.lab=createCodaPianoLab({host:document.querySelector('#pianoroom'),
           renderer:createCodaCharacterRenderer(),getAvatar:()=>({}),
           storage:{getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)},
           onClose:()=>exits++,onReward:(id,amount)=>{rewards.push({id,amount});return {ok:true,amount};}});
          document.querySelector('#returnFocus').focus();lab.open();
        }''')

    def tearDown(self):
        self.page.evaluate('lab.destroy()')
        self.context.close()
        self.assertEqual(self.errors, [])

    def state(self):
        return self.page.evaluate('lab.getState()')

    def walk(self,x,y):
        canvas = self.page.locator('#pianoRoomCanvas')
        canvas.scroll_into_view_if_needed()
        box = canvas.bounding_box()
        self.page.mouse.click(box['x']+x/1000*box['width'],box['y']+y/620*box['height'])
        self.page.wait_for_function('([x,y])=>Math.hypot(lab.getState().player.x-x,lab.getState().player.y-y)<4',arg=[x,y])

    def play(self,midi):
        self.page.locator(f'.piano-key[data-midi="{midi}"]').click()

    def test_walkable_piano_sounds_on_entry_and_projects_the_note_on_back_wall(self):
        self.page.locator('#pianoRoomCanvas').focus()
        before = self.state()['player']['y']
        self.page.keyboard.down('s'); self.page.wait_for_timeout(180); self.page.keyboard.up('s')
        self.assertGreater(self.state()['player']['y'],before+10)
        self.walk(160,530)
        self.assertEqual(self.state()['floorNote'],60)
        self.assertEqual(self.state()['lastWallNote'],60)
        self.assertEqual(self.page.locator('#pianoWallNote').inner_text(),'Back wall: C4')
        self.assertEqual(self.state()['audioState'],'running')
        self.assertEqual(self.page.locator('.piano-key-name:visible').count(),0)
        self.page.locator('#pianoKeyNames').check()
        self.assertEqual(self.page.locator('.piano-key-name:visible').count(),25)
        self.walk(160,330); self.assertEqual(self.state()['held'],[])

    def test_chopin_melody_requires_e_on_floor_and_only_rewards_complete_correct_tune(self):
        self.page.locator('#pianoLesson').select_option('twinkle')
        self.walk(160,530)
        self.assertEqual(self.state()['lessonStep'],0)
        self.assertIsNone(self.state()['lastWallNote'])
        self.assertEqual(self.state()['held'],[])
        self.page.keyboard.down('e')
        self.page.wait_for_timeout(120)
        self.page.keyboard.down('e')
        self.assertEqual(self.state()['lessonStep'],1,'Key auto-repeat must not advance the repeated C')
        self.page.keyboard.up('e')
        self.page.keyboard.press('e'); self.assertEqual(self.state()['lessonStep'],2)
        self.assertEqual(self.page.evaluate('rewards'),[])
        self.play(62); self.assertEqual(self.state()['lessonStep'],2,'Wrong pitches must not advance')
        for offset in TWINKLE[2:]: self.play(60+offset)
        self.assertEqual(self.state()['lessonStep'],len(TWINKLE))
        self.assertEqual(self.page.evaluate('rewards'),[{'id':'piano-lesson:twinkle','amount':35}])
        self.page.locator('#pianoLessonRestart').click()
        for offset in TWINKLE: self.play(60+offset)
        self.assertEqual(len(self.page.evaluate('rewards')),1)

    def test_interval_game_checks_start_before_target_for_both_directions(self):
        for challenge,start,target in [('up-7',60,67),('down-4',72,68)]:
            self.page.locator('#pianoInterval').select_option(challenge)
            self.page.locator('#pianoStartInterval').click()
            self.play(target); self.assertEqual(self.state()['intervalStep'],0)
            self.play(start); self.assertEqual(self.state()['intervalStep'],1)
            self.play(61); self.assertEqual(self.state()['intervalStep'],1)
            self.play(target); self.assertEqual(self.state()['intervalStep'],2)
        self.assertEqual([row['id'] for row in self.page.evaluate('rewards')],['piano-interval:up-7','piano-interval:down-4'])

    def test_recording_real_polyphony_playback_and_close_release_audio_and_restore_focus(self):
        self.page.locator('#pianoRecord').click()
        self.page.locator('#pianoKeyboardMode').select_option('piano')
        self.page.locator('#pianoRecord').focus()
        self.page.keyboard.down('a'); self.page.keyboard.down('d')
        self.assertEqual(sorted(self.state()['held']),[60,64])
        self.page.wait_for_timeout(150)
        self.page.keyboard.up('a'); self.page.keyboard.up('d')
        self.page.locator('#pianoRecord').click()
        self.assertEqual(len(self.state()['recorded']),2)
        self.page.locator('#pianoPlayback').click()
        self.assertTrue(self.state()['playing'])
        self.page.keyboard.press('Escape')
        self.assertFalse(self.state()['open']); self.assertEqual(self.state()['held'],[])
        self.assertFalse(self.state()['playing']); self.assertFalse(self.state()['recording'])
        self.assertEqual(self.page.evaluate('exits'),1)
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'returnFocus')
        self.page.evaluate('lab.open()')
        self.assertEqual(len(self.state()['recorded']),2)
        self.page.locator('#closepiano').focus(); self.page.keyboard.press('Shift+Tab')
        self.assertTrue(self.page.evaluate('pianoroom.contains(document.activeElement)'))

    def test_painted_keys_keep_their_art_and_hit_the_same_perspective_polygons(self):
        background = 'data:image/png;base64,'+base64.b64encode((ROOT/'assets/world/piano-lab-room.png').read_bytes()).decode()
        self.page.evaluate('''url=>{
          lab.destroy();window.lab=createCodaPianoLab({host:document.querySelector('#pianoroom'),
           renderer:createCodaCharacterRenderer(),backgroundUrl:url,
           storage:{getItem:()=>null,setItem:()=>{}},onReward:()=>true});lab.open();
        }''',background)
        self.page.wait_for_function('lab.getState().background.ready')
        self.page.wait_for_timeout(70)
        result = self.page.evaluate('''()=>{
          const canvas=document.querySelector('#pianoRoomCanvas'),g=canvas.getContext('2d');
          const expected=document.createElement('canvas');expected.width=1000;expected.height=620;
          const painter=expected.getContext('2d');painter.imageSmoothingEnabled=false;
          const image=new Image();image.src=lab.getState().background.url;
          return image.decode().then(()=>{
            painter.drawImage(image,0,0,1000,620);
            return [[327,75],[400,450],[700,500]].map(([x,y])=>({
             actual:Array.from(g.getImageData(x,y,1,1).data),
             expected:Array.from(painter.getImageData(x,y,1,1).data)}));
          });
        }''')
        for pixel in result: self.assertEqual(pixel['actual'],pixel['expected'],'Live piano must preserve the painted key and wall-frame pixels')
        keys=self.state()['floorKeys'];self.assertEqual(len(keys),22)
        def point(midi):
            key=next(key for key in keys if key['midi']==midi)
            if key['black']:
                return [sum(p[0] for p in key['polygon'])/4,sum(p[1] for p in key['polygon'])/4]
            return [(key['polygon'][2][0]+key['polygon'][3][0])/2,key['polygon'][2][1]-10]
        self.walk(*point(60));self.assertEqual(self.state()['floorNote'],60);self.assertEqual(self.state()['lastWallNote'],60)
        self.walk(*point(61));self.assertEqual(self.state()['floorNote'],61);self.assertEqual(self.state()['lastWallNote'],61)
        self.page.locator('#pianoLesson').select_option('mary')
        self.walk(*point(64));self.assertEqual(self.state()['lessonStep'],0);self.assertEqual(self.state()['lastWallNote'],61)
        self.page.keyboard.press('e');self.assertEqual(self.state()['lessonStep'],1);self.assertEqual(self.state()['lastWallNote'],64)


if __name__=='__main__': unittest.main()
