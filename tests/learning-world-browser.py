"""Exercise the assembled rooms, purchases, mission bridge, levels and records.

The public origin is routed to this checkout in disposable Chromium profiles.
A tiny cabinet fixture supplies authenticated completion events; game scoring
and ordered-hit tracking have independent module tests.
"""
import json
import mimetypes
from pathlib import Path
import unittest
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
WORLD='https://cwoodmusic.github.io/coda-arcade/world-preview.html'
TRIAD='''<!doctype html><html data-coda-game="triad"><meta charset="utf-8">
<button id="finishMatch">Finish fixture match</button><script>
let token='',serial=0;
window.CodaBridge={report(id,result){parent.postMessage({coda:1,type:'result',game:'triad',token,runId:id,result},location.origin);}};
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.coda===1&&event.data.type==='init')token=event.data.token;});
finishMatch.onclick=()=>CodaBridge.report('fixture-'+(++serial),{mode:'computer',score:9,captures:4,won:true,comeback:true});
parent.postMessage({coda:1,type:'ready',game:'triad'},location.origin);
</script></html>'''

class WorldBrowserCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop()

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1550,'height':1050})
        self.context.route('https://**/*',lambda route:route.abort())
        self.context.route('https://cwoodmusic.github.io/**',self.route_checkout)
        self.context.route('https://pitch-race-default-rtdb.firebaseio.com/leaderboards/classic.json',
          lambda route:route.fulfill(status=200,content_type='application/json',
            headers={'access-control-allow-origin':'*'},body=json.dumps({'record':{'initials':'COD','score':1234,'streak':30,'level':0}})))
        self.context.add_init_script("localStorage.setItem('codaArcadeFXV1','off')")
        self.page=self.context.new_page();self.page.set_default_timeout(10000)
        self.errors=[];self.failures=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.on('console',lambda msg:self.errors.append(msg.text) if 'Arcade frame error:' in msg.text else None)
        self.page.on('response',lambda response:self.failures.append(response.url)
          if response.status>=400 and 'cwoodmusic.github.io/coda-arcade/' in response.url and not response.url.endswith('favicon.ico') else None)
        self.load()

    def route_checkout(self,route):
        path=urlparse(route.request.url).path
        if path=='/musictriad/':return route.fulfill(status=200,content_type='text/html',body=TRIAD)
        relative=path.removeprefix('/coda-arcade/').lstrip('/') or 'index.html'
        file=ROOT/relative
        if file.is_dir():file=file/'index.html'
        if not file.is_file():return route.fulfill(status=404,body='Missing fixture resource')
        route.fulfill(path=str(file),content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream')

    def load(self):
        self.page.goto(WORLD,wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole?.ready()&&CodaArcadeQA?.notes()')

    def tearDown(self):
        self.context.close();self.assertEqual(self.errors,[]);self.assertEqual(self.failures,[])

    def place(self,x,y):
        self.assertTrue(self.page.evaluate('([x,y])=>CodaArcadeQA.place(x,y)',[x,y]))
        self.page.wait_for_timeout(100);self.page.locator('#view').focus()

    def approach_musician(self,person):
        self.assertTrue(self.page.evaluate('''id=>{
          const person=CodaArcadeQA.characters().npcs.find(p=>p.id===id&&!p.hidden);
          if(!person)return false;
          for(const [dx,dy]of [[30,0],[-30,0],[0,30],[0,-30]])
            if(CodaArcadeQA.place(person.x+dx,person.y+dy))return true;
          return false;
        }''',person))

    def open_bach_mission(self):
        self.page.locator('#musiciansBtn').click()
        self.page.get_by_role('button',name='Missions from J. S. Bach',exact=True).click()

    def leave_musician(self,person):
        self.assertTrue(self.page.evaluate('''id=>{
          const person=CodaArcadeQA.characters().npcs.find(p=>p.id===id);
          for(const [x,y]of [[1180,620],[350,280],[400,740],[1340,725]])
            if(Math.hypot(x-person.x,y-person.y)>200&&CodaArcadeQA.place(x,y))return true;
          return false;
        }''',person))

class LearningWorldTests(WorldBrowserCase):

    def test_counter_attendants_open_the_correct_boutique_and_shop(self):
        people=self.page.evaluate('CodaArcadeQA.shopkeepers()')
        self.assertEqual(len(people),2)
        for person in people:
            self.assertTrue(person['visible'])
            approach=next(point for point in person['approaches'] if self.page.evaluate('p=>CodaArcadeQA.walkable(p.x,p.y)',point))
            self.place(approach['x'],approach['y']);self.page.keyboard.press('e')
            self.assertTrue(self.page.locator('#panel').is_visible())
            title=self.page.locator('#panelTitle').inner_text()
            self.assertIn('Notes Shop' if 'Riff' in person['name'] else 'Boutique',title)
            self.page.locator('#panelClose').click()
        self.page.locator('#notesBtn').click()
        self.page.locator('[data-shop-item="witch"] button').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),70)
        self.page.locator('[data-shop-item="witch"] button').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.characters().player.appearance.headwear'),'witch')
        self.load();self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),70)
        self.assertIn('witch',self.page.evaluate('CodaArcadeQA.notes().owned'))

    def test_real_room_entrances_pause_world_and_load_the_detailed_art(self):
        for selector,qa in [('#pianoLabBtn','piano'),('#classroomBtn','classroom')]:
            entrance=next(entry for entry in self.page.evaluate('CodaArcadeQA.entrances()') if ('Piano' in entry['name'])==(qa=='piano'))
            self.assertGreater(len(self.page.evaluate('p=>CodaArcadeQA.route(1180,388,p.x,p.y)',entrance['approach'])),0)
            self.place(entrance['approach']['x'],entrance['approach']['y']);before=self.page.evaluate('CodaArcadeQA.position()')
            self.page.keyboard.press('e');self.page.wait_for_function(f'CodaArcadeQA.{qa}().open')
            self.page.keyboard.down('d');self.page.wait_for_timeout(150);self.page.keyboard.up('d')
            self.assertEqual(self.page.evaluate('CodaArcadeQA.position()'),before,'World avatar must pause inside a music room')
            if qa=='piano':self.page.wait_for_function('CodaArcadeQA.piano().background.ready')
            self.page.keyboard.press('Escape');self.page.wait_for_function(f'!CodaArcadeQA.{qa}().open')
            self.page.locator(selector).click();self.assertTrue(self.page.evaluate(f'CodaArcadeQA.{qa}().open'))
            self.page.keyboard.press('Escape')

    def test_completed_mission_requires_quest_giver_before_reward_and_keeps_hall_record(self):
        self.open_bach_mission();self.leave_musician('bach')
        self.page.get_by_role('button',name='Accept mission',exact=True).click()
        self.page.get_by_role('button',name='Play Music Triad',exact=True).click()
        cabinet=self.page.frame_locator('#gameiframe')
        cabinet.locator('#finishMatch').click()
        self.page.wait_for_function('CodaArcadeQA.notes().balance===166')
        self.page.locator('#returnworld').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.progression().xp'),162)
        self.open_bach_mission();self.assertTrue(self.page.get_by_role('button',name='Collect reward',exact=True).is_disabled())
        self.approach_musician('bach');self.open_bach_mission()
        self.page.get_by_role('button',name='Collect reward',exact=True).click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),256)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.progression().xp'),262)
        before=self.page.evaluate('CodaArcadeQA.progression().xp')
        self.page.locator('#notesBtn').click();self.page.locator('[data-shop-item="witch"] button').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.progression().xp'),before,'Currency spending gives no experience')
        self.page.locator('#panelClose').click()
        self.page.locator('#hallFameBtn').click()
        self.page.wait_for_function("document.querySelector('.fame-public')?.textContent.includes('COD')")
        self.assertIn('9 cards',self.page.locator('.hall-of-fame').inner_text())
        self.assertIn('1234 points',self.page.locator('.fame-public').inner_text())
        self.load();self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),176)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.progression().xp'),before)

    def test_chopin_reward_persists_without_repeat_farming(self):
        self.page.locator('#pianoLabBtn').click()
        self.page.locator('#pianoInterval').select_option('up-7')
        self.page.locator('#pianoStartInterval').click()
        for note in [60,67]:self.page.locator(f'.piano-key[data-midi="{note}"]').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),185)
        self.assertGreater(self.page.evaluate('CodaArcadeQA.progression().xp'),0)
        before=self.page.evaluate('CodaArcadeQA.progression().xp')
        self.page.keyboard.press('Escape');self.load()
        self.page.locator('#pianoLabBtn').click();self.page.locator('#pianoInterval').select_option('up-7')
        self.page.locator('#pianoStartInterval').click()
        for note in [60,67]:self.page.locator(f'.piano-key[data-midi="{note}"]').click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),185)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.progression().xp'),before)

    def test_old_visible_plant_project_cannot_repaint_the_permanent_repair(self):
        self.page.evaluate('''()=>{
          const project=CodaDeveloperConsole.getProject(),plant=project.assets.find(a=>a.id==='asset-8');
          plant.visible=true;plant.origin.bounds=[754,609,65,72];
          plant.crop=[0,0,65,72];plant.w=65;plant.h=72;
          localStorage.setItem('codaWorldProjectV1',JSON.stringify({...project,savedAt:1}));
        }''')
        self.load()
        self.assertEqual(self.page.evaluate('CodaDeveloperConsole.getProjectSource()'),'local')
        self.assertTrue(self.page.evaluate("CodaDeveloperConsole.getProject().assets.find(a=>a.id==='asset-8').visible"),
                        'Loading the repair must preserve user project data')
        self.assertEqual(self.page.evaluate("CodaArcadeQA.liftedObjectPixel('dance_passage_plant_leaves',787,645)"),[0,0,0,0])

    def test_dance_floor_reacts_to_grounded_feet_and_keeps_the_painted_grid(self):
        tiles=self.page.evaluate('''()=>CodaArcadeQA.danceFloor().tiles.filter(tile=>
          CodaArcadeQA.walkable(...tile.center))''')
        self.assertGreater(len(tiles),50)
        first=tiles[20];self.place(*first['center'])
        self.assertEqual(self.page.evaluate('CodaArcadeQA.danceFloor().current'),first['id'])
        self.assertGreater(len({round(p[0],2) for p in first['polygon']}),2,
                           'Painted perspective cells must keep their sloping seams')
        self.page.keyboard.press('Space')
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight>3')
        self.assertIsNone(self.page.evaluate('CodaArcadeQA.danceFloor().current'))
        self.page.wait_for_function('CodaArcadeQA.characters().player.jumpHeight===0')
        self.assertEqual(self.page.evaluate('CodaArcadeQA.danceFloor().current'),first['id'])
        second=tiles[21];self.place(*second['center'])
        lights=self.page.evaluate('CodaArcadeQA.danceFloor().active')
        self.assertEqual(self.page.evaluate('CodaArcadeQA.danceFloor().current'),second['id'])
        self.assertIn(first['id'],[entry['id'] for entry in lights],
                      'Departed tiles fade after a step instead of snapping off')

if __name__=='__main__':unittest.main(verbosity=2)
