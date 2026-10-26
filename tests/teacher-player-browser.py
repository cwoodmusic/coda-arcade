"""Teacher player saves across devices, using real loopback Firebase SDKs.

Run through tools/test-classroom-service.cjs --teacher-player. Production
service, profile DTO and tab storage run unchanged. Service intervals are fired
deterministically; Firebase network timers remain real. No live service is used.
"""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location(
    'teacher_player_service_fixture', Path(__file__).with_name('classroom-service-browser.py'))
fixture = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fixture)


class TeacherPlayerBrowserTests(unittest.TestCase):
    setUpClass = classmethod(fixture.ClassroomServiceBrowserTests.setUpClass.__func__)
    tearDownClass = classmethod(fixture.ClassroomServiceBrowserTests.tearDownClass.__func__)
    setUp = fixture.ClassroomServiceBrowserTests.setUp
    tearDown = fixture.ClassroomServiceBrowserTests.tearDown
    device = fixture.ClassroomServiceBrowserTests.device
    call = fixture.ClassroomServiceBrowserTests.call
    assert_ok = fixture.ClassroomServiceBrowserTests.assert_ok
    join = fixture.ClassroomServiceBrowserTests.join
    cloud = fixture.ClassroomServiceBrowserTests.cloud

    def start(self, page, enabled=True):
        # Only intervals installed synchronously by the service constructor are
        # controlled here. SDK timers are created after start() returns.
        page.evaluate('''()=>{
          window.__teacherRealInterval=window.setInterval;
          window.setInterval=function(fn,delay){
            const id=__teacherRealInterval.call(this,fn,delay);
            clearInterval(id);return id;
          };
        }''')
        try:
            fixture.ClassroomServiceBrowserTests.start(self, page, enabled)
        finally:
            page.evaluate('window.setInterval=window.__teacherRealInterval')

    def personal_cloud(self):
        value=fixture.database('classroomV1/teacherPlayers/'+self.teacher_uid)
        if value:
            # RTDB omits empty arrays/objects; the canonical DTO restores their
            # defaults on read, exactly as the production service does.
            checked=self.admin.evaluate('data=>CodaClassroomProfileData.validate(data)',value['state']['data'])
            self.assertTrue(checked.get('ok'),checked)
            value['state']['data']=checked['data']
        return value

    def current(self, page):
        result=page.evaluate('CodaClassroomProfileData.capture(localStorage)')
        self.assertTrue(result.get('ok'),result)
        return result['data']

    def local_player(self, page, xp, notes, shirt='#7252b5', walked=500):
        page.evaluate('([xp,notes])=>fixtureProgress(xp,notes)',[xp,notes])
        page.evaluate('''({shirt,walked})=>{
          const avatar=JSON.parse(localStorage.musicArcadeV1);
          Object.assign(avatar,{name:'Mr Wood',hairstyle:'ponytail',shirt,
            lowerColor:'#345678',headwear:'beanie',eyewear:'glasses',
            customized:true,walked,jumps:15,emotesUsed:6});
          localStorage.musicArcadeV1=JSON.stringify(avatar);
        }''',{'shirt':shirt,'walked':walked})
        return self.current(page)

    def seed(self, page=None):
        page=page or self.admin
        expected=self.local_player(page,480,220)
        self.assert_ok(self.call(page,'savePersonalPlayer'))
        self.assertTrue(self.call(page,'getState')['personal']['active'])
        self.assertEqual(self.current(page),expected)
        return expected

    def sign_in(self, page):
        self.assert_ok(self.call(page,'adminSignIn'))

    def fire_autosave(self, page):
        page.evaluate('''()=>{
          for(const timer of fixtureTimers.filter(timer=>timer.delay===1500))timer.fn();
        }''')
        page.wait_for_function('!fixtureService.getState().pending')

    def test_initial_login_never_adopts_the_old_device_and_explicit_newest_seed_restores_all_progress(self):
        old=self.device()
        stale=self.local_player(old,25,4,shirt='#998877',walked=20)
        self.sign_in(old)
        self.assertIsNone(self.personal_cloud())
        self.assertFalse(self.call(old,'getState')['personal']['available'])
        self.assertEqual(self.current(old),stale)

        expected=self.seed()
        cloud=self.personal_cloud()
        self.assertEqual(cloud['meta']['alias'],'Mr Wood')
        self.assertEqual(cloud['state']['data'],expected)
        self.assertNotIn('teacher@example.invalid',json.dumps(cloud))
        self.assertEqual(cloud['state']['revision'],1)

        self.assert_ok(self.call(old,'adminSignOut'))
        self.sign_in(old)
        self.assertEqual(self.current(old),expected)
        state=self.call(old,'getState')
        self.assertEqual(state['profile']['kind'],'teacher')
        self.assertEqual(state['profile']['alias'],'Mr Wood')
        self.assertTrue(state['personal']['active'])
        self.assertTrue(self.call(old,'isWritable'))
        self.assertIsNone(fixture.database('classroomV1/sessions'))

    def test_autosave_reload_and_stale_device_cas_cannot_replace_newer_progress(self):
        self.seed()
        other=self.device();self.sign_in(other)
        latest=self.local_player(self.admin,830,420,shirt='#146f85',walked=900)
        self.fire_autosave(self.admin)
        saved=self.personal_cloud()
        self.assertEqual(saved['state']['data'],latest)
        self.assertEqual(saved['state']['revision'],2)

        # The second device still owns revision1. Its older local play cannot
        # be sent as a replacement for the newer revision2 server snapshot.
        self.local_player(other,510,230,shirt='#bb5566')
        result=self.call(other,'flush')
        self.assertFalse(result['ok'],result)
        self.assertEqual(self.personal_cloud()['state'],saved['state'])
        self.assertFalse(self.call(other,'isWritable'))

        other.reload();other.wait_for_function('window.fixtureReady');self.start(other)
        result=self.call(other,'resume')
        if not result['ok']:
            self.assert_ok(self.call(other,'useSavedProgress'))
        self.assertEqual(self.current(other),latest)
        self.assertTrue(self.call(other,'isWritable'))

    def test_same_tab_reload_restores_google_player_without_another_sign_in(self):
        expected=self.seed()
        old_marker=self.admin.evaluate('fixtureScope.getState().marker')
        self.admin.reload();self.admin.wait_for_function('window.fixtureReady');self.start(self.admin)
        self.assert_ok(self.call(self.admin,'resume'))
        self.assertEqual(self.current(self.admin),expected)
        self.assertEqual(self.call(self.admin,'getState')['profile']['kind'],'teacher')
        self.assertEqual(self.admin.evaluate('fixtureScope.getState().tabId'),old_marker['tabId'])
        self.assertTrue(self.call(self.admin,'isWritable'))

    def test_sign_out_restores_the_previous_guest_and_stops_personal_writes(self):
        self.local_player(self.admin,70,8,shirt='#8a562f')
        before=self.admin.evaluate('CodaClassroomProfileData.backup(localStorage)')
        self.assert_ok(self.call(self.admin,'savePersonalPlayer'))
        self.local_player(self.admin,900,500,shirt='#6f2244')
        self.assert_ok(self.call(self.admin,'flush'))
        saved=self.personal_cloud()['state']
        self.assert_ok(self.call(self.admin,'adminSignOut'))
        state=self.call(self.admin,'getState')
        self.assertFalse(state['admin']['signedIn'])
        self.assertFalse(state['personal']['active'])
        self.assertIsNone(state['profile'])
        self.assertEqual(self.admin.evaluate('CodaClassroomProfileData.backup(localStorage)'),before)
        self.local_player(self.admin,5,1)
        self.call(self.admin,'flush')
        self.assertEqual(self.personal_cloud()['state'],saved)

    def test_revocation_locks_personal_progress_before_it_can_be_saved_again(self):
        self.seed();saved=self.personal_cloud()['state']
        fixture.database('classroomV1/admins/'+self.teacher_uid,method='DELETE')
        self.admin.wait_for_function('!fixtureService.getState().admin.authorized')
        self.assertFalse(self.call(self.admin,'isWritable'))
        self.local_player(self.admin,980,600)
        self.assertFalse(self.call(self.admin,'flush')['ok'])
        self.assertEqual(self.personal_cloud()['state'],saved)

    def test_student_profile_is_not_adopted_and_switching_to_existing_personal_save_preserves_it(self):
        personal=self.seed()
        self.assert_ok(self.call(self.admin,'adminSignOut'))
        student=self.device();self.join(student)
        student.evaluate('fixtureProgress(55,30)')
        self.assert_ok(self.call(student,'flush'))
        student_state=self.cloud()['state']
        self.sign_in(student)
        self.assertEqual(self.call(student,'getState')['profile']['profileId'],self.card['profileId'])
        self.assertFalse(self.call(student,'savePersonalPlayer')['ok'])
        self.assertEqual(self.cloud()['state'],student_state)
        self.assert_ok(self.call(student,'openPersonalPlayer'))
        self.assertEqual(self.current(student),personal)
        self.assertEqual(self.cloud()['state'],student_state)
        self.assertEqual(self.call(student,'getState')['profile']['kind'],'teacher')

    def test_explicit_close_stays_closed_after_reload_without_signing_out_the_teacher(self):
        expected=self.seed()
        self.assert_ok(self.call(self.admin,'leave'))
        self.admin.reload();self.admin.wait_for_function('window.fixtureReady');self.start(self.admin)
        self.assert_ok(self.call(self.admin,'resume'))
        state=self.call(self.admin,'getState')
        self.assertTrue(state['admin']['authorized'])
        self.assertFalse(state['personal']['active'])
        self.assertIsNone(state['profile'])
        self.assert_ok(self.call(self.admin,'openPersonalPlayer'))
        self.assertEqual(self.current(self.admin),expected)

    def test_offline_sign_out_finishes_and_cannot_send_a_queued_personal_write(self):
        self.seed();saved=self.personal_cloud()['state']
        self.admin.evaluate('fixtureSDK.goOffline(fixtureSDK.getDatabase(fixtureSDK.getApps().find(app=>app.name==="coda-classroom-admin")))')
        self.local_player(self.admin,980,600)
        self.admin.evaluate('window.fixtureOfflineSignout=fixtureService.adminSignOut().then(result=>window.fixtureOfflineResult=result)')
        self.admin.wait_for_function('window.fixtureOfflineResult',timeout=6000)
        self.assert_ok(self.admin.evaluate('fixtureOfflineResult'))
        self.assertFalse(self.call(self.admin,'getState')['admin']['signedIn'])
        self.assertFalse(self.call(self.admin,'getState')['personal']['active'])
        self.assertIsNotNone(self.admin.evaluate('sessionStorage.getItem("codaClassroomPendingV1")'))
        self.admin.evaluate('fixtureSDK.goOnline(fixtureSDK.getDatabase(fixtureSDK.getApps().find(app=>app.name==="coda-classroom-admin")))')
        self.admin.wait_for_timeout(800)
        self.assertEqual(self.personal_cloud()['state'],saved)

    def test_teacher_idle_saves_then_closes_the_personal_player(self):
        self.seed()
        latest=self.local_player(self.admin,900,500)
        self.admin.evaluate('''()=>{
          window.fixtureNow=Date.now()+600001;
          for(const timer of fixtureTimers.filter(timer=>timer.delay===10000))timer.fn();
        }''')
        self.admin.wait_for_function('!fixtureService.getState().admin.signedIn',timeout=6000)
        self.assertIsNone(self.call(self.admin,'getState')['profile'])
        self.assertFalse(self.call(self.admin,'isWritable'))
        self.assertEqual(self.personal_cloud()['state']['data'],latest)

    def test_offline_teacher_recovery_survives_another_students_save(self):
        self.seed()
        self.admin.evaluate('fixtureSDK.goOffline(fixtureSDK.getDatabase(fixtureSDK.getApps().find(app=>app.name==="coda-classroom-admin")))')
        unsent=self.local_player(self.admin,980,600,shirt='#225588')
        self.admin.evaluate('fixtureService.adminSignOut().then(result=>window.fixtureOfflineResult=result)')
        self.admin.wait_for_function('window.fixtureOfflineResult',timeout=6000)
        self.assert_ok(self.admin.evaluate('fixtureOfflineResult'))
        self.join(self.admin)
        self.admin.evaluate('fixtureProgress(55,30)')
        self.assert_ok(self.call(self.admin,'flush'))
        student_saved=self.cloud()['state']
        self.assert_ok(self.call(self.admin,'leave'))
        self.sign_in(self.admin)
        self.assertEqual(self.current(self.admin),unsent)
        self.assert_ok(self.call(self.admin,'flush'))
        self.assertEqual(self.personal_cloud()['state']['data'],unsent)
        self.assertEqual(self.cloud()['state'],student_saved)


if __name__=='__main__':
    unittest.main(verbosity=2)
