"""Real relationship quest, carried discovery, scholar hand-in, records and quizzes."""
import importlib.util
from pathlib import Path
from urllib.parse import urlparse
import unittest
from world_navigation_helpers import talk_to_musician,open_settings,open_cabinet,_close_world_panels,advance_world
spec=importlib.util.spec_from_file_location('history_world',Path(__file__).with_name('learning-world-browser.py'))
world=importlib.util.module_from_spec(spec);spec.loader.exec_module(world)
PITCH='''<!doctype html><html data-coda-game="pitch"><meta charset="utf-8"><button id="finishHistoryRun">Complete fixture race</button><script>
let token='';window.CodaBridge={report(id,result){parent.postMessage({coda:1,type:'result',game:'pitch',token,runId:id,result},location.origin)}};
addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='init')token=event.data.token});
finishHistoryRun.onclick=()=>CodaBridge.report('scholar-browser-run',{mode:'classic',score:120,correct:12,misses:0,streak:12,won:true,perfect:true});
parent.postMessage({coda:1,type:'ready',game:'pitch'},location.origin);
</script></html>'''

class MusicHistoryBrowserTests(world.WorldBrowserCase):
    def route_checkout(self,route):
        if urlparse(route.request.url).path=='/Pitch-Race/':return route.fulfill(status=200,content_type='text/html',body=PITCH)
        return super().route_checkout(route)

    def close_history(self):
        self.page.locator('.music-history').get_by_role('button',name='Close',exact=True).click()

    def scholar(self):
        _close_world_panels(self.page)
        point=self.page.evaluate('CodaArcadeQA.scholar().approach')
        self.place(point['x'],point['y']);self.page.keyboard.press('e')
        self.page.locator('.music-history[open]').wait_for()

    def talk_history(self,person='bach'):
        talk_to_musician(self.page,person)
        self.page.locator('[data-history-owner-prompt="'+person+'"]').click()

    def test_scholar_is_seated_outside_visitor_cap_and_records_begin_locked(self):
        self.assertEqual(self.page.evaluate('CodaArcadeQA.visitors().limit'),6)
        self.assertFalse(self.page.evaluate('CodaArcadeQA.characters().npcs.some(p=>p.id==="scholar")'))
        self.assertTrue(self.page.evaluate('CodaArcadeQA.scholar().visible'))
        self.assertEqual(self.page.evaluate('CodaArcadeQA.scholar().activity'),'relaxing')
        self.scholar();journal=self.page.locator('.music-history')
        journal.get_by_role('button',name='Historian’s record',exact=True).click()
        self.assertIn('0 / 540',journal.inner_text());self.assertEqual(journal.locator('.history-fact.locked').count(),540)
        self.assertNotIn('born in Eisenach',journal.text_content())
        journal.get_by_label('Search recorded facts').fill('Eisenach');self.assertEqual(journal.locator('.history-fact').count(),0)
        journal.get_by_label('Search recorded facts').fill('');journal.get_by_label('Journal musician').select_option('bach');self.assertEqual(journal.locator('.history-fact.locked').count(),30)
        journal.get_by_role('button',name='Music history quizzes',exact=True).click()
        self.assertTrue(journal.locator('[data-history-quiz="bach"] button').is_disabled())
        self.close_history();open_settings(self.page)
        self.assertEqual(self.page.locator('#worldMusicHistory').inner_text(),'Find the scholar')

    def test_spam_cannot_unlock_facts_but_real_quest_unlocks_one_then_scholar_rewards_it(self):
        self.talk_history();journal=self.page.locator('.music-history')
        for _ in range(3):
            self.assertIn('No new facts',journal.inner_text());self.assertEqual(journal.locator('[data-discovered-fact]').count(),0)
            self.assertEqual(journal.get_by_role('button',name='Tell me another fact').count(),0)
            self.close_history();self.page.locator('[data-history-owner-prompt="bach"]').click()
        journal.get_by_role('button',name='Accept relationship quest',exact=True).click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.history().active.game'),'pitch')
        self.close_history();open_cabinet(self.page,0)
        self.page.frame_locator('#gameiframe').locator('#finishHistoryRun').click()
        self.page.wait_for_function('CodaArcadeQA.history().people.find(p=>p.id==="bach").hasNewFact')
        self.page.locator('#returnworld').click();talk_to_musician(self.page,'bach')
        prompt=self.page.locator('[data-history-owner-prompt="bach"]');self.assertIn('!',prompt.inner_text());prompt.click()
        self.assertEqual(journal.locator('[data-discovered-fact]').get_attribute('data-discovered-fact'),'bach-01')
        self.assertEqual(self.page.evaluate('CodaArcadeQA.history().carriedIDs'),['bach-01'])
        self.assertEqual(self.page.evaluate('CodaArcadeQA.history().recordedCount'),0)
        self.close_history();self.page.locator('[data-history-owner-prompt="bach"]').click()
        self.assertIn('No new facts',journal.inner_text());self.assertEqual(journal.locator('[data-discovered-fact]').count(),0)
        self.close_history();self.scholar();balance=self.page.evaluate('CodaArcadeQA.notes().balance')
        journal.get_by_role('button',name='Give carried facts to the scholar',exact=True).click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),balance+50)
        self.assertEqual(self.page.evaluate('CodaArcadeQA.history().carriedIDs'),[])
        journal.get_by_role('button',name='Historian’s record',exact=True).click();journal.get_by_label('Journal musician').select_option('bach')
        self.assertEqual(journal.locator('.history-fact:not(.locked)').count(),1);self.assertEqual(journal.locator('.history-fact.locked').count(),29)
        self.assertIn('born in Eisenach',journal.inner_text());self.close_history()
        self.page.reload();self.page.wait_for_function('window.CodaDeveloperConsole?.ready()');self.assertEqual(self.page.evaluate('CodaArcadeQA.history().recordedCount'),1)

    def test_progression_controls_use_temporary_player_and_quiz_requires_full_record(self):
        native=self.page.evaluate('localStorage.getItem("codaMusicHistoryV1")')
        self.page.keyboard.press('F2');self.page.locator('#devTab-history').click()
        pane=self.page.locator('#dev-history')
        self.assertIn('read-only',pane.inner_text());self.assertEqual(pane.get_by_role('button',name='Set all 30 facts recorded').count(),0)
        pane.get_by_role('button',name='Open temporary progression test',exact=True).click()
        self.page.wait_for_function('window.CodaDeveloperTestMode?.isEnabled()&&window.CodaDeveloperConsole?.ready()')
        self.page.keyboard.press('F2');self.page.locator('#devTab-history').click();pane.get_by_label('History progression character').select_option('bach')
        pane.get_by_role('button',name='Set all 30 facts recorded',exact=True).click()
        self.assertEqual(self.page.evaluate('CodaArcadeQA.history().people.find(p=>p.id==="bach").recordedCount'),30)
        self.page.keyboard.press('F2');self.scholar();journal=self.page.locator('.music-history')
        journal.get_by_role('button',name='Music history quizzes',exact=True).click();journal.locator('[data-history-quiz="bach"] button').click()
        self.assertEqual(journal.locator('[data-quiz-question]').count(),10)
        self.assertTrue(journal.get_by_role('button',name='Finish quiz',exact=True).is_disabled())
        for field in journal.locator('[data-quiz-question]').all():
            identifier=field.get_attribute('data-quiz-question')
            correct=self.page.evaluate('id=>{const q=CodaMusicHistoryQuizData.find(q=>q.id===id);return q.choices[q.answer]}',identifier)
            field.get_by_role('radio',name=correct,exact=True).check()
        journal.get_by_role('button',name='Finish quiz',exact=True).click()
        self.assertIn('10 / 10',journal.inner_text());self.assertIn('Passed!',journal.inner_text())
        balance=self.page.evaluate('CodaArcadeQA.notes().balance')
        journal.get_by_role('button',name='Back to history quizzes').click();journal.locator('[data-history-quiz="bach"] button').click()
        for field in journal.locator('[data-quiz-question]').all():field.get_by_role('radio').first.check()
        journal.get_by_role('button',name='Finish quiz',exact=True).click();self.assertEqual(self.page.evaluate('CodaArcadeQA.notes().balance'),balance)
        self.close_history();self.page.goto(world.WORLD,wait_until='domcontentloaded');self.page.wait_for_function('window.CodaDeveloperConsole?.ready()')
        self.assertEqual(self.page.evaluate('localStorage.getItem("codaMusicHistoryV1")'),native)

    def test_phone_record_and_scholar_pouch_are_readable(self):
        self.page.set_viewport_size({'width':390,'height':844});self.scholar();journal=self.page.locator('.music-history')
        journal.get_by_role('button',name='Historian’s record',exact=True).click();journal.get_by_label('Journal musician').select_option('bach')
        dimensions=journal.evaluate('(el)=>({width:el.clientWidth,scroll:el.scrollWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})')
        self.assertLessEqual(dimensions['scroll'],dimensions['width']+1);self.assertGreaterEqual(dimensions['left'],0);self.assertLessEqual(dimensions['right'],390)
        self.page.screenshot(path='/tmp/coda-scholar-phone.png')

if __name__=='__main__':unittest.main(verbosity=2)
