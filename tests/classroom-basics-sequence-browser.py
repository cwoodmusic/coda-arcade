"""Teach mnemonic maps before the first staff question; walk out of the room."""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode=True
_spec=importlib.util.spec_from_file_location('basics_fixture',Path(__file__).with_name('classroom-tutorials-browser.py'))
fixture=importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fixture)


class ClassroomBasicsSequenceTests(unittest.TestCase):
    setUpClass=classmethod(fixture.ClassroomTutorialTests.setUpClass.__func__)
    tearDownClass=classmethod(fixture.ClassroomTutorialTests.tearDownClass.__func__)
    setUp=fixture.ClassroomTutorialTests.setUp
    tearDown=fixture.ClassroomTutorialTests.tearDown
    load=fixture.ClassroomTutorialTests.load
    open_lesson=fixture.ClassroomTutorialTests.open_lesson
    state=fixture.ClassroomTutorialTests.state

    def test_both_bottom_to_top_maps_are_taught_before_the_first_staff_note(self):
        self.open_lesson('note-naming')
        for letter in ['C','F','D','A']:
            self.assertEqual(self.page.locator('[data-note-reminder]').count(),0)
            self.page.locator('[data-lesson-try]').click()
            self.page.locator('[data-note-answer="'+letter+'"]').click()
            self.page.locator('[data-tutorial-next]').click()
        self.assertEqual(self.state()['active']['step'],4)
        self.assertEqual(self.state()['active']['noteReminder'],'lines')
        self.assertEqual(self.page.locator('[data-note-answer]').count(),0)
        self.assertEqual(self.page.locator('[data-lesson-try]').count(),0)
        lines=self.page.locator('[data-note-reminder="lines"]')
        self.assertIn('Every Good Boy Does Fine',lines.inner_text())
        self.assertIn('BOTTOM to the TOP',lines.inner_text())
        svg=lines.locator('svg')
        self.assertIn('E G B D F',svg.get_attribute('aria-label'))
        self.assertEqual(svg.locator('ellipse').count(),5)
        self.page.locator('.classroom-tutorial').screenshot(path='/tmp/treble-mnemonics-desktop.png')
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertFalse(self.page.locator('#room').evaluate('host=>host.scrollWidth>innerWidth'))
        self.assertGreaterEqual(svg.evaluate('node=>node.getBoundingClientRect().width/node.viewBox.baseVal.width*30'),19)
        self.page.locator('.classroom-tutorial').screenshot(path='/tmp/treble-mnemonics-phone.png')
        self.page.set_viewport_size({'width':1250,'height':1000})
        self.page.locator('[data-note-reminder-next]').click()
        self.assertEqual(self.state()['active']['noteReminder'],'spaces')
        spaces=self.page.locator('[data-note-reminder="spaces"]')
        self.assertIn('FACE',spaces.inner_text())
        self.assertIn('BOTTOM to the TOP',spaces.inner_text())
        self.assertEqual(spaces.locator('svg ellipse').count(),4)
        self.assertEqual(self.page.locator('[data-note-answer]').count(),0)
        self.assertEqual(self.page.locator('[data-lesson-try]').count(),0)
        self.page.locator('[data-note-reminder-next]').click()
        self.assertIsNone(self.state()['active']['noteReminder'])
        self.assertTrue(self.page.locator('[data-lesson-try]').is_visible())
        self.page.locator('[data-lesson-try]').click()
        self.page.locator('[data-note-answer="E"]').click()
        self.assertTrue(self.state()['active']['answered'])
        self.page.locator('[data-tutorial-next]').click()
        before=self.state()['active']
        self.page.locator('[data-note-reminders]').click()
        self.page.locator('[data-note-reminder-next]').click()
        self.page.locator('[data-note-reminder-next]').click()
        after=self.state()['active']
        for field in ['step','learningStage','answered']:
            self.assertEqual(after[field],before[field],'Review must preserve the active note question')
        self.assertEqual(self.page.evaluate('rewards'),[])

    def test_reload_at_the_first_staff_checkpoint_reopens_the_maps(self):
        self.open_lesson('note-naming')
        for letter in ['C','F','D','A']:
            self.page.locator('[data-lesson-try]').click()
            self.page.locator('[data-note-answer="'+letter+'"]').click()
            self.page.locator('[data-tutorial-next]').click()
        self.page.locator('[data-note-reminder-next]').click()
        self.load()
        self.open_lesson('note-naming')
        self.assertEqual(self.state()['active']['step'],4)
        self.assertEqual(self.state()['active']['noteReminder'],'lines')
        self.assertEqual(self.page.locator('[data-note-answer]').count(),0)

    def test_walking_to_the_bottom_door_then_e_returns_to_the_arcade(self):
        self.assertTrue(self.page.evaluate('roomUI.getState().open'))
        self.assertEqual(self.page.evaluate('roomUI.getState().player.y'),510)
        self.assertNotEqual(self.page.evaluate('roomUI.getState().near?.type'), 'exit')
        self.page.locator('#classroomCanvas').focus()
        self.page.keyboard.down('s')
        self.page.wait_for_timeout(260)
        self.page.keyboard.up('s')
        self.page.wait_for_function('roomUI.getState().near?.type==="exit"')
        self.assertGreater(self.page.evaluate('roomUI.getState().player.y'),530)
        self.assertEqual(self.page.evaluate('roomUI.getState().exit'),{'id':'arcade-exit','x':500,'y':560,'radius':40})
        self.page.keyboard.press('e')
        self.assertFalse(self.page.evaluate('roomUI.getState().open'))
        self.assertTrue(self.page.locator('#room').is_hidden())
        self.assertFalse(self.page.evaluate('roomUI.getState().audioPlaying'))
        self.page.locator('#enter').click()
        self.assertEqual(self.page.evaluate('roomUI.getState().player.y'),510)
        self.assertNotEqual(self.page.evaluate('roomUI.getState().near?.type'),'exit')

    def test_mobile_joystick_movement_and_interact_use_the_same_door_exit(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertTrue(self.page.evaluate('roomUI.controlMove(0,1)'))
        self.page.wait_for_timeout(260)
        self.page.evaluate('roomUI.controlMove(0,0)')
        self.page.wait_for_function('roomUI.getState().near?.type==="exit"')
        self.assertTrue(self.page.evaluate('roomUI.control("e",true)'))
        self.assertFalse(self.page.evaluate('roomUI.getState().open'))

    def test_required_missing_study_cannot_silently_open_the_quiz(self):
        self.page.evaluate('''()=>{
          roomUI.close();
          const host=document.createElement('section');document.body.append(host);
          localStorage.setItem(CodaClassroomTutorials.KEY,JSON.stringify({version:1,lessons:{'note-naming':{step:10,completed:false,completedAt:0}}}));
          window.strictLesson=CodaClassroomTutorials.create({host,requireExamCurriculum:true});strictLesson.open('note-naming');
        }''')
        self.assertEqual(self.page.evaluate('strictLesson.getState().active.phase'),'study')
        self.assertTrue(self.page.locator('[data-study-retry-load]').is_visible())
        self.assertEqual(self.page.locator('[data-quiz-answer]').count(),0)
        self.page.locator('[data-study-exit]').click()
        self.assertEqual(self.page.evaluate('strictLesson.getState().active.phase'),'lesson')
        self.assertEqual(self.page.evaluate('strictLesson.getState().active.step'),9)


if __name__=='__main__':
    unittest.main(verbosity=2)
