"""One-shot title-screen profile routes exercise the real classroom boot code.

The fake service deliberately pauses resume/join. This verifies that routing
cannot open a profile dialog before identity restoration finishes, without
requiring authentication or allowing any external requests.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = b'''<!doctype html><meta charset="utf-8"><title>Classroom entry fixture</title>
<script src="/classroom-profile-data.js"></script>
<script src="/classroom-storage.js"></script>
<script src="/classroom-service.js"></script>
<script>
window.ARCADE_ACCOUNTS_CONFIG={mode:'classroom',classroom:{privacy:true,enabled:false}};
const seed=new URL(location.href).searchParams.get('seed');
if(seed==='owner'){
 const tabId='entry-tab-0001',marker={version:1,tabId,epoch:'entry-epoch-0001',classId:'class-entry-0001',profileId:'profile-entry-0001'};
 window.name='__codaClassroomTabV1:'+tabId;
 sessionStorage.setItem('codaClassroomTabV1',tabId);
 sessionStorage.setItem('codaClassroomActiveV1',JSON.stringify(marker));
 localStorage.setItem('codaClassroomWorkspaceV1',JSON.stringify(marker));
}
window.fixtureViews=[];window.fixtureJoins=[];window.fixtureResumeCalls=0;window.fixtureSignInCalls=0;
window.fixtureState={profile:seed==='owner'?{classId:'class-entry-0001',profileId:'profile-entry-0001',alias:'Blue Otter 27'}:null,locked:false,waitingTakeover:false,loading:true};
window.fixturePending=new Promise(resolve=>window.fixtureFinish=result=>{fixtureState.loading=false;resolve(result);});
window.CodaClassroom={...CodaClassroom,create:options=>{window.fixtureIdentityChange=options.onIdentityChange;return {
 getState:()=>fixtureState,subscribe:()=>()=>{},isWritable:()=>true,
 resume:()=>{fixtureResumeCalls++;return fixturePending;},
 join:pass=>{fixtureJoins.push(pass);return fixturePending;},
 adminSignIn:()=>{fixtureSignInCalls++;return {ok:true};},leave:async()=>({ok:true})
};}};
window.createCodaClassroomUI=()=>({open:(view='student')=>fixtureViews.push(view),close(){}});
</script><script src="/classroom-boot.js"></script>
<body><script>
window.fixtureRuntime=CodaClassroomBoot.start();window.fixtureReady=true;
</script></body>'''


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        if urlsplit(self.path).path in ('/entry-fixture.html', '/index.html',
                                      '/classic-arcade.html', '/world-preview.html'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(FIXTURE)))
            self.end_headers()
            self.wfile.write(FIXTURE)
        elif urlsplit(self.path).path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()


class ClassroomEntryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0),
            functools.partial(Handler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path='/usr/bin/chromium',
                                            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop()
        cls.server.shutdown(); cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.external, self.errors, self.failed = [], [], []
        def route(request_route):
            if urlsplit(request_route.request.url).hostname != '127.0.0.1':
                self.external.append(request_route.request.url)
                request_route.abort()
            else:
                request_route.continue_()
        self.context.route('**/*', route)
        self.page = self.context.new_page()
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.failed.append(response.url)
                     if response.status >= 400 else None)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.external, [], 'Entry routes must not start external sign-in')
        self.assertEqual(self.errors, [])
        self.assertEqual(self.failed, [])

    def load(self, suffix):
        self.page.goto(self.base + suffix)
        self.page.wait_for_function('window.fixtureReady')

    def finish(self):
        self.page.evaluate('fixtureFinish({ok:true})')
        self.page.wait_for_function('!fixtureState.loading')
        self.page.evaluate('()=>new Promise(resolve=>setTimeout(resolve,0))')

    def test_student_entry_is_consumed_and_waits_for_identity_before_opening(self):
        self.load('/entry-fixture.html?profile=student&room=piano#ordinary-anchor')
        self.assertEqual(self.page.evaluate('location.search'), '?room=piano')
        self.assertEqual(self.page.evaluate('location.hash'), '#ordinary-anchor')
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.assertEqual(self.page.evaluate('fixtureResumeCalls'), 1)
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), ['student'])
        self.page.evaluate('fixtureRuntime.open("admin")')
        self.assertEqual(self.page.evaluate('fixtureViews'), ['student', 'admin'])
        self.assertEqual(self.page.evaluate('fixtureSignInCalls'), 0)

    def test_teacher_entry_opens_admin_once_and_never_signs_in_automatically(self):
        self.load('/entry-fixture.html?profile=admin&room=piano')
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), ['admin'])
        self.assertEqual(self.page.evaluate('fixtureSignInCalls'), 0)
        self.assertEqual(self.page.evaluate('location.search'), '?room=piano')
        self.page.reload(); self.page.wait_for_function('window.fixtureReady')
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), [],
                         'Identity reload must not reopen a consumed title action')

    def test_teacher_entry_still_opens_after_an_existing_profile_resumes(self):
        self.load('/entry-fixture.html?seed=owner&profile=admin')
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), ['admin'])
        self.assertFalse(self.page.evaluate('CodaClassroomBoot.getState().preparing'))

    def test_requested_teacher_view_survives_only_boots_identity_reload(self):
        self.load('/entry-fixture.html?seed=owner&profile=admin&keep=1')
        tab_id = self.page.evaluate('CodaClassroomStorageInstance.tabId')
        with self.page.expect_navigation(wait_until='load'):
            # Match the real service order: identity change requests a reload,
            # then resume resolves in the old document before navigation ends.
            self.page.evaluate('''()=>{
              fixtureIdentityChange({reason:'resumed',reloadNeeded:true});
              fixtureFinish({ok:true});
            }''')
        self.page.wait_for_function('window.fixtureReady')
        self.assertEqual(self.page.evaluate('CodaClassroomStorageInstance.tabId'), tab_id)
        self.assertEqual(self.page.evaluate('new URL(location.href).searchParams.get("profile")'), None)
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.assertIsNone(self.page.evaluate('sessionStorage.getItem("codaClassroomEntryV1")'),
                          'Reload handoff is consumed in the new document head')
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), ['admin'])
        self.page.reload(); self.page.wait_for_function('window.fixtureReady')
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), [],
                         'A later ordinary reload must not replay the title action')

    def test_copied_reload_intent_cannot_open_teacher_ui_in_another_tab(self):
        self.load('/entry-fixture.html')
        self.finish()
        self.page.evaluate('''()=>sessionStorage.setItem('codaClassroomEntryV1',JSON.stringify({
          version:1,tabId:CodaClassroomStorageInstance.tabId,view:'admin'
        }))''')
        original_tab = self.page.evaluate('CodaClassroomStorageInstance.tabId')
        with self.page.expect_popup() as event:
            self.page.evaluate('window.open("/entry-fixture.html","_blank")')
        popup = event.value
        popup.on('pageerror', lambda error: self.errors.append(str(error)))
        popup.wait_for_function('window.fixtureReady')
        self.assertNotEqual(popup.evaluate('CodaClassroomStorageInstance.tabId'), original_tab)
        self.assertIsNone(popup.evaluate('sessionStorage.getItem("codaClassroomEntryV1")'))
        popup.evaluate('fixtureFinish({ok:true})')
        popup.wait_for_function('!fixtureState.loading')
        popup.evaluate('()=>new Promise(resolve=>setTimeout(resolve,0))')
        self.assertEqual(popup.evaluate('fixtureViews'), [])

    def test_unrecognized_profile_parameter_does_not_trigger_a_dialog(self):
        self.load('/entry-fixture.html?profile=other&keep=1#anchor')
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.assertEqual(self.page.evaluate('location.search'), '?profile=other&keep=1')
        self.assertEqual(self.page.evaluate('location.hash'), '#anchor')

    def test_card_fragment_is_consumed_without_turning_the_pass_into_a_query(self):
        self.load('/entry-fixture.html?profile=student&keep=1#classroom-pass=fixture-private-pass')
        self.assertEqual(self.page.evaluate('location.search'), '?keep=1')
        self.assertEqual(self.page.evaluate('location.hash'), '')
        self.assertEqual(self.page.evaluate('fixtureJoins'), ['fixture-private-pass'])
        self.assertEqual(self.page.evaluate('fixtureResumeCalls'), 0)
        self.assertEqual(self.page.evaluate('fixtureViews'), [])
        self.finish()
        self.assertEqual(self.page.evaluate('fixtureViews'), ['student'])

    def test_only_the_original_arcade_redirects_an_owned_profile_to_the_world(self):
        self.load('/index.html?seed=owner')
        self.assertEqual(urlsplit(self.page.url).path, '/index.html')
        self.finish()
        self.load('/classic-arcade.html?seed=owner')
        self.page.wait_for_url(self.base + '/world-preview.html')
        self.page.wait_for_function('window.fixtureReady')
        self.assertEqual(urlsplit(self.page.url).path, '/world-preview.html')


if __name__ == '__main__':
    unittest.main(verbosity=2)
