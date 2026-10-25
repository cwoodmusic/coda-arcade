"""Piano Lab regression checks using its real DOM, animation, and Web Audio."""
from pathlib import Path
import base64
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MARY = [4,2,0,2,4,4,4,2,2,2,4,7,7,4,2,0,2,4,4,4,4,2,2,4,2,0]
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
          window.entries=new Map();window.rewards=[];window.rewardCalls=[];window.rewardLedger=new Set();window.rewardMode='success';window.exits=0;
          window.makeLab=()=>{window.lab=createCodaPianoLab({host:document.querySelector('#pianoroom'),
           renderer:createCodaCharacterRenderer(),getAvatar:()=>({}),
           storage:{getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value)},
           onClose:()=>exits++,onReward:(id,amount)=>{rewardCalls.push({id,amount});if(rewardMode==='throw')throw new Error('Test reward unavailable');if(rewardMode==='fail')return {ok:false,amount};if(rewardLedger.has(id))return {ok:true,alreadyClaimed:true,amount:0};rewardLedger.add(id);rewards.push({id,amount});return {ok:true,amount};}});};
          makeLab();document.querySelector('#returnFocus').focus();lab.open();
        }''')

    def tearDown(self):
        self.page.evaluate('lab.destroy()')
        self.context.close()
        self.assertEqual(self.errors, [])

    def state(self):
        return self.page.evaluate('lab.getState()')

    def menu(self,view):
        if self.page.locator('#pianoDialogueBackdrop').is_visible():self.page.locator('#pianoDialogueClose').click()
        if not self.state()['menuOpen']:self.page.locator('#pianoMenuButton').click()
        if self.state()['mobileView']!=view:self.page.locator(f'[data-piano-view="{view}"]').click()

    def close_panels(self):
        if self.page.locator('#pianoDialogueBackdrop').is_visible():self.page.locator('#pianoDialogueClose').click()
        if self.state()['menuOpen']:self.page.locator('#pianoMenuClose').click()

    def choose_melody(self,identifier):
        self.menu('games');self.page.locator('#pianoLesson').select_option(identifier)
        self.page.locator('[data-piano-dialogue-action="play"]').click()

    def walk(self,x,y):
        self.close_panels()
        canvas = self.page.locator('#pianoRoomCanvas')
        canvas.scroll_into_view_if_needed()
        box = canvas.bounding_box()
        self.page.mouse.click(box['x']+x/1000*box['width'],box['y']+y/620*box['height'])
        self.page.wait_for_function('([x,y])=>Math.hypot(lab.getState().player.x-x,lab.getState().player.y-y)<4',arg=[x,y])

    def play(self,midi):
        self.menu('keyboard')
        self.page.locator(f'.piano-key[data-midi="{midi}"]').click()

    def begin_memory(self):
        self.menu('games');self.page.locator('#pianoMemoryStart').click()
        self.page.locator('[data-piano-dialogue-action="play"]').click()

    def test_main_room_is_uncluttered_and_chopin_offers_several_melodies_in_dialogue(self):
        self.assertFalse(self.state()['menuOpen']);self.assertFalse(self.state()['dialogueOpen'])
        self.assertFalse(self.page.locator('.piano-workspace').is_visible())
        self.assertFalse(self.page.locator('.piano-mobile-nav').is_visible())
        self.menu('games')
        options=self.page.locator('#pianoLesson option').all_text_contents()
        self.assertGreaterEqual(len(options)-1,9)
        self.assertTrue(any('Mary' in value for value in options))
        self.assertTrue(any('Ode to Joy' in value for value in options))
        self.page.locator('#pianoTalkChopin').click()
        self.assertTrue(self.state()['dialogueOpen'])
        self.assertIsNone(self.state()['lesson'],'Talking must offer a choice rather than auto-start Twinkle')
        self.assertTrue(self.page.locator('#pianoDialogueText').is_visible())
        self.page.locator('[data-piano-dialogue-action="melodies"]').click()
        self.assertGreaterEqual(self.page.locator('[data-piano-melody]').count(),9)
        self.page.locator('[data-piano-melody="mary"]').click()
        self.page.locator('[data-piano-dialogue-action="play"]').click()
        self.assertEqual(self.state()['lesson'],'mary')
        self.assertFalse(self.state()['dialogueOpen']);self.assertFalse(self.state()['menuOpen'])
        self.assertEqual(self.state()['lessonStep'],0)

    def test_memory_requires_learning_hides_hints_and_rewards_only_once_across_visits(self):
        self.menu('games');self.page.locator('#pianoLesson').select_option('mary')
        self.page.locator('[data-piano-dialogue-action="play"]').click()
        self.menu('games');self.assertTrue(self.page.locator('#pianoMemoryStart').is_disabled())
        for offset in MARY:self.play(60+offset)
        self.assertEqual(self.page.evaluate('rewards'),[{'id':'piano-lesson:mary','amount':35}])
        self.assertTrue(self.page.locator('[data-piano-dialogue-action="memory"]').is_visible())
        self.page.locator('[data-piano-dialogue-action="memory"]').click()
        self.page.locator('[data-piano-dialogue-action="play"]').click()
        self.assertEqual(self.state()['melodyMode'],'memory')
        self.menu('keyboard');self.assertEqual(self.page.locator('.piano-key.is-next').count(),0)
        self.play(64);self.assertEqual(self.state()['lessonStep'],1)
        self.play(65);self.assertEqual(self.state()['lessonStep'],0,'A wrong note must restart the memory attempt')
        progress=self.page.locator('#pianoLessonProgress').inner_text()
        self.assertNotRegex(progress,r'\b[A-G](?:[♯♭])?\b','The future melody must be hidden in memory mode')
        feedback=self.page.locator('#pianoRoomMessage').inner_text()
        self.assertNotRegex(feedback,r'(?:lower|higher|highest) [A-G]','Retry feedback must not reveal the answer')
        for offset in MARY:self.play(60+offset)
        self.assertEqual(self.page.evaluate('rewards'),[{'id':'piano-lesson:mary','amount':35},{'id':'piano-memory:mary','amount':60}])
        self.page.evaluate('lab.destroy();makeLab();lab.open()')
        self.choose_melody('mary')
        self.begin_memory()
        for offset in MARY:self.play(60+offset)
        self.assertEqual(len(self.page.evaluate('rewards')),2,'A new visit cannot farm the same memory reward')
        self.assertIn('piano-memory:mary',self.state()['completed'])

    def test_failed_reward_can_retry_without_unlocking_memory_early(self):
        self.page.evaluate("rewardMode='fail'")
        self.choose_melody('mary')
        for offset in MARY:self.play(60+offset)
        self.assertEqual(self.page.evaluate('rewards'),[])
        self.assertNotIn('piano-lesson:mary',self.state()['completed'])
        self.assertNotIn('mary',self.state()['learned'])
        retry=self.page.locator('[data-piano-dialogue-action="retry-reward"]')
        self.assertTrue(retry.is_visible())
        self.page.evaluate("rewardMode='throw'");retry.click()
        self.assertEqual(self.page.evaluate('rewards'),[])
        self.page.evaluate("rewardMode='success'")
        self.page.locator('[data-piano-dialogue-action="retry-reward"]').click()
        self.assertEqual(self.page.evaluate('rewards'),[{'id':'piano-lesson:mary','amount':35}])
        self.assertIn('mary',self.state()['learned'])
        self.begin_memory()
        self.assertEqual(self.state()['melodyMode'],'memory')

    def test_hearing_a_demonstration_never_plays_the_challenge_for_you(self):
        self.page.clock.install();self.page.clock.pause_at(self.page.evaluate('Date.now()/1000')+5)
        self.menu('games');self.page.locator('#pianoLesson').select_option('hot-cross-buns')
        self.page.locator('[data-piano-dialogue-action="listen"]').click()
        self.assertTrue(self.state()['listening']);self.assertEqual(self.state()['lessonStep'],0)
        self.page.clock.run_for(9000)
        self.assertFalse(self.state()['listening']);self.assertEqual(self.state()['lessonStep'],0)
        self.assertEqual(self.page.evaluate('rewards'),[]);self.assertEqual(self.state()['held'],[])
        self.page.locator('[data-piano-dialogue-action="play"]').click()
        self.assertFalse(self.state()['dialogueOpen']);self.assertEqual(self.state()['lessonStep'],0)

    def test_recording_playback_never_completes_a_challenge(self):
        self.page.evaluate('''notes=>{
          lab.destroy();entries.set('codaPianoTakeV1',JSON.stringify(notes.map((offset,index)=>({midi:60+offset,at:index*.08,duration:.04}))));makeLab();lab.open();
        }''',MARY)
        self.choose_melody('mary')
        self.menu('recording');self.page.locator('#pianoPlayback').click()
        self.page.wait_for_function('!lab.getState().playing')
        self.assertEqual(self.state()['lessonStep'],0);self.assertEqual(self.page.evaluate('rewards'),[])
        for offset in MARY:self.play(60+offset)
        self.begin_memory()
        self.menu('recording');self.page.locator('#pianoPlayback').click()
        self.page.wait_for_function('!lab.getState().playing')
        self.assertEqual(self.state()['lessonStep'],0)
        self.assertEqual(self.state()['melodyMode'],'memory')
        self.assertEqual(len(self.page.evaluate('rewards')),1)

    def test_walkable_piano_sounds_on_entry_and_projects_the_note_on_back_wall(self):
        self.page.locator('#pianoRoomCanvas').focus()
        before = self.state()['player']['y']
        self.page.keyboard.down('s'); self.page.wait_for_timeout(180); self.page.keyboard.up('s')
        self.assertGreater(self.state()['player']['y'],before+10)
        self.walk(160,530)
        self.assertEqual(self.state()['floorNote'],60)
        self.assertEqual(self.state()['lastWallNote'],60)
        self.assertEqual(self.page.locator('#pianoWallNote').inner_text(),'Back wall: C')
        self.assertEqual(self.state()['audioState'],'running')
        self.assertEqual(self.page.locator('.piano-key-name:visible').count(),0)
        self.menu('settings');self.page.locator('#pianoKeyNames').check()
        self.menu('keyboard');self.assertEqual(self.page.locator('.piano-key-name:visible').count(),25)
        self.walk(160,330); self.assertEqual(self.state()['held'],[])

    def test_learner_labels_drop_octave_numbers_but_keep_interval_starts_exact(self):
        self.page.evaluate('''()=>{
          window.pianoCanvasWords=[];
          const original=CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText=function(value,...args){
            if(this.canvas.id==='pianoRoomCanvas')pianoCanvasWords.push(String(value));
            return original.call(this,value,...args);
          };
        }''')
        self.menu('settings');self.page.locator('#pianoKeyNames').check()
        self.menu('keyboard');names=self.page.locator('.piano-key-name').all_text_contents()
        self.assertEqual(names[:3],['C','C♯','D'])
        self.assertTrue(all(not any(character.isdigit() for character in name) for name in names))
        for name in ['Play lower C','Play higher C','Play highest C']:
            self.assertEqual(self.page.get_by_role('button',name=name,exact=True).count(),1)
        self.play(72)
        self.assertEqual(self.state()['lastWallNote'],72,'The real sounding pitch keeps its internal range')
        self.assertEqual(self.page.locator('#pianoWallNote').inner_text(),'Back wall: C')
        self.menu('games');self.page.locator('#pianoInterval').select_option('down-4')
        self.page.locator('#pianoStartInterval').click()
        if self.page.locator('[data-piano-dialogue-action="play"]').is_visible():self.page.locator('[data-piano-dialogue-action="play"]').click()
        self.assertIn('higher C',self.page.locator('#pianoIntervalPrompt').inner_text())
        self.play(60);self.assertEqual(self.state()['intervalStep'],0,'The lower C is still the wrong starting key')
        self.play(72);self.assertEqual(self.state()['intervalStep'],1)
        self.play(68);self.assertEqual(self.state()['intervalStep'],2)
        self.page.wait_for_timeout(40)
        import re
        visible=self.page.locator('#pianoroom').inner_text()
        self.assertIsNone(re.search(r'\b[A-G][♯♭]?[0-9]\b',visible))
        self.assertTrue(self.page.evaluate("pianoCanvasWords.some(word=>word==='C')"))
        self.assertFalse(self.page.evaluate("pianoCanvasWords.some(word=>/\\b[A-G][♯♭]?[0-9]\\b/.test(word))"))
        self.menu('settings');self.page.locator('#pianoOctave').select_option('3')
        self.assertEqual(self.page.locator('#pianoOctave option:checked').inner_text(),'Low notes')
        self.menu('keyboard')
        self.assertEqual(self.page.get_by_role('button',name='Play lower C',exact=True).get_attribute('data-midi'),'48')

    def test_chopin_melody_requires_e_on_floor_and_only_rewards_complete_correct_tune(self):
        self.choose_melody('twinkle')
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
        self.menu('games');self.page.locator('#pianoLessonRestart').click()
        if self.page.locator('[data-piano-dialogue-action="play"]').is_visible():self.page.locator('[data-piano-dialogue-action="play"]').click()
        for offset in TWINKLE: self.play(60+offset)
        self.assertEqual(len(self.page.evaluate('rewards')),1)

    def test_interval_game_checks_start_before_target_for_both_directions(self):
        for challenge,start,target in [('up-7',60,67),('down-4',72,68)]:
            self.menu('games');self.page.locator('#pianoInterval').select_option(challenge)
            self.page.locator('#pianoStartInterval').click()
            if self.page.locator('[data-piano-dialogue-action="play"]').is_visible():self.page.locator('[data-piano-dialogue-action="play"]').click()
            self.play(target); self.assertEqual(self.state()['intervalStep'],0)
            self.play(start); self.assertEqual(self.state()['intervalStep'],1)
            self.play(61); self.assertEqual(self.state()['intervalStep'],1)
            self.play(target); self.assertEqual(self.state()['intervalStep'],2)
        self.assertEqual([row['id'] for row in self.page.evaluate('rewards')],['piano-interval:up-7','piano-interval:down-4'])

    def test_recording_real_polyphony_playback_and_close_release_audio_and_restore_focus(self):
        self.menu('settings');self.page.locator('#pianoKeyboardMode').select_option('piano')
        self.menu('recording');self.page.locator('#pianoRecord').click()
        self.menu('keyboard');self.page.locator('.piano-key[data-midi="60"]').focus()
        self.page.keyboard.down('a'); self.page.keyboard.down('d')
        self.assertEqual(sorted(self.state()['held']),[60,64])
        self.page.wait_for_timeout(150)
        self.page.keyboard.up('a'); self.page.keyboard.up('d')
        self.menu('recording');self.page.locator('#pianoRecord').click()
        self.assertEqual(len(self.state()['recorded']),2)
        self.page.locator('#pianoPlayback').click()
        self.assertTrue(self.state()['playing'])
        self.page.keyboard.press('Escape')
        if self.state()['open']:self.page.keyboard.press('Escape')
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
        self.choose_melody('mary')
        self.walk(*point(64));self.assertEqual(self.state()['lessonStep'],0);self.assertEqual(self.state()['lastWallNote'],61)
        self.page.keyboard.press('e');self.assertEqual(self.state()['lessonStep'],1);self.assertEqual(self.state()['lastWallNote'],64)


if __name__=='__main__': unittest.main()
