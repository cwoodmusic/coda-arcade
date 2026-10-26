"""Teacher personal-player UI: explicit first save and student isolation.

Production UI/CSS run with an in-memory service. No Firebase, real login,
clipboard, or live profiles are accessed.
"""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    'teacher_player_ui_fixture', Path(__file__).with_name('classroom-profile-ui-browser.py'))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)

PERSONAL_FIXTURE = r'''()=>{
 localStorage.musicArcadeV1=JSON.stringify({name:'Mr Wood <arcade>',shirt:'#778899'});
 const open=()=>{
  __emit({personal:{available:true,active:true},profile:{kind:'teacher',
   classId:'teacher_personal',profileId:'teacherSetupUID_123456',alias:'Mr Wood <arcade>',picture:'owl'}});
  return {ok:true};
 };
 __service.savePersonalPlayer=async()=>{__record('savePersonalPlayer');return open();};
 __service.openPersonalPlayer=async()=>{__record('openPersonalPlayer');return open();};
 const leave=__service.leave;
 __service.leave=async options=>{const result=await leave(options);if(result.ok)__emit({personal:{available:true,active:false}});return result;};
 __emit({personal:{available:false,active:false}});
}'''


class TeacherPlayerUITests(unittest.TestCase):
    setUpClass = classmethod(fixture.ClassroomProfileUITests.setUpClass.__func__)
    tearDownClass = classmethod(fixture.ClassroomProfileUITests.tearDownClass.__func__)
    tearDown = fixture.ClassroomProfileUITests.tearDown
    idle = fixture.ClassroomProfileUITests.idle
    admin = fixture.ClassroomProfileUITests.admin
    calls = fixture.ClassroomProfileUITests.calls

    def setUp(self):
        fixture.ClassroomProfileUITests.setUp(self)
        self.page.evaluate(PERSONAL_FIXTURE)

    def test_first_save_is_explicit_names_current_player_and_defaults_to_cancel(self):
        self.admin()
        self.assertEqual(self.calls('savePersonalPlayer'), [])
        self.assertIn('device with your latest progress', self.page.locator('.classpass-personal-player').inner_text())
        self.page.locator('#classpassPersonalSave').click()
        self.assertIn('Mr Wood <arcade>', self.page.get_by_role('alertdialog').inner_text())
        self.assertIn('first save', self.page.get_by_role('alertdialog').inner_text())
        self.assertTrue(self.page.locator('#classpassCancel').evaluate('node=>node===document.activeElement'))
        self.assertEqual(self.page.locator('arcade').count(), 0, 'Nickname is rendered as text')
        self.page.locator('#classpassCancel').click()
        self.assertEqual(self.calls('savePersonalPlayer'), [])
        self.page.locator('#classpassPersonalSave').click()
        self.page.locator('#classpassConfirm').click()
        self.idle()
        self.assertEqual(len(self.calls('savePersonalPlayer')), 1)
        self.assertEqual(self.page.evaluate('__openedProfiles[0].kind'), 'teacher')
        self.assertTrue(self.page.locator('#classpassPersonalOpen').is_disabled())

    def test_student_cannot_be_saved_as_teacher_but_existing_player_can_be_opened(self):
        self.page.locator('#classpassJoinInput').fill('student-card')
        self.page.locator('#classpassJoin').click(); self.idle()
        self.admin()
        self.assertTrue(self.page.locator('#classpassPersonalSave').is_disabled())
        self.assertIn('Leave the student profile', self.page.locator('.classpass-personal-player').inner_text())
        self.assertEqual(self.calls('savePersonalPlayer'), [])
        self.page.evaluate('__emit({personal:{available:true,active:false}})')
        self.assertEqual(self.page.locator('#classpassPersonalSave').count(), 0)
        self.page.locator('#classpassPersonalOpen').click(); self.idle()
        self.assertEqual(len(self.calls('openPersonalPlayer')), 1)
        self.assertEqual(self.calls('savePersonalPlayer'), [])

    def test_confirmation_cannot_save_a_changed_player_or_after_revocation(self):
        self.admin()
        self.page.locator('#classpassPersonalSave').click()
        self.page.evaluate('localStorage.musicArcadeV1=JSON.stringify({name:"Other player"})')
        self.page.locator('#classpassConfirm').click()
        self.assertEqual(self.calls('savePersonalPlayer'), [])
        self.assertIn('Your player changed', self.page.locator('#classpassStatus').inner_text())
        self.page.locator('#classpassPersonalSave').click()
        self.page.evaluate('__emit({admin:{signedIn:true,authorized:false,uid:"teacherSetupUID_123456"}})')
        self.assertEqual(self.page.get_by_role('alertdialog').count(), 0)
        self.assertEqual(self.page.locator('#classpassPersonalSave').count(), 0)
        self.assertEqual(self.calls('savePersonalPlayer'), [])

    def test_personal_page_uses_google_instructions_and_closes_without_card_language(self):
        self.admin()
        self.page.evaluate('__emit({personal:{available:true,active:false}})')
        self.page.locator('#classpassPersonalOpen').click(); self.idle()
        self.page.locator('#classpassTab-student').click()
        self.assertEqual(self.page.locator('#classpassTab-student').inner_text(), 'My player')
        self.assertIn('Sign in on another device', self.page.locator('body').inner_text())
        self.assertNotIn('Use your card', self.page.locator('body').inner_text())
        self.page.locator('#classpassLeave').click()
        self.assertIn('Google account', self.page.get_by_role('alertdialog').inner_text())
        self.assertNotIn('card', self.page.get_by_role('alertdialog').inner_text())
        self.page.locator('#classpassConfirm').click(); self.idle()
        self.assertEqual(len(self.calls('leave')), 1)
        self.assertIn('It stays saved with your Google account', self.page.locator('#classpassStatus').inner_text())

    def test_conflicted_personal_player_exposes_recovery_from_teacher_page(self):
        self.admin()
        self.page.evaluate('''__emit({personal:{available:true,active:true},
         profile:{kind:'teacher',profileId:'teacherSetupUID_123456',alias:'Mr Wood'},
         locked:true,pending:true,code:'unsaved-conflict'})''')
        self.assertEqual(self.page.locator('#classpassPersonalOpen').count(), 0)
        self.assertIn('needs a check', self.page.locator('.classpass-personal-player').inner_text())
        self.page.locator('#classpassPersonalCheck').click()
        self.assertTrue(self.page.locator('#classpassUseSaved').is_visible())
        self.assertEqual(self.calls('useSavedProgress'), [], 'Checking does not discard unsaved progress')


if __name__ == '__main__':
    unittest.main(verbosity=2)
