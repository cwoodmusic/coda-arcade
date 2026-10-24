"""Run against a disposable browser profile and a temporary local static server.

Requires the environment's Python Playwright package and Chromium. No npm setup.
"""
import base64
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class WorldEditorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/world-preview.html'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1600, 'height': 1000})
        # Cloud login is optional; these local editor tests must not contact Firebase.
        self.context.route('https://**/*', lambda route: route.abort())
        self.page = self.context.new_page()
        self.page.set_default_timeout(7000)
        self.errors = []
        self.local_failures = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('console', lambda msg: self.errors.append(msg.text) if 'Arcade frame error:' in msg.text else None)
        self.page.on('response', lambda response: self.local_failures.append(response.url) if response.status >= 400 and '127.0.0.1' in response.url and not response.url.endswith('favicon.ico') else None)
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_function('window.CodaDeveloperConsole?.ready()')
        self.page.wait_for_function('window.CodaArcadeQA?.foregroundPixelAlpha("dance_right_couch",625,650)!==null')
        # Use the shipped FX control to keep pixel assertions and CI timing stable.
        self.page.locator('#fxBtn').click()
        self.page.locator('#fxBtn').click()
        self.page.keyboard.press('F2')

    def tearDown(self):
        errors, failures = self.errors[:], self.local_failures[:]
        self.context.close()
        self.assertEqual(errors, [], 'Browser script/frame errors')
        self.assertEqual(failures, [], 'Failed local resources')

    def project(self):
        return self.page.evaluate('CodaDeveloperConsole.getProject()')

    def tab(self, name):
        self.page.locator('#devTab-' + name).click()

    def field(self, name, value):
        target = self.page.locator('#' + name)
        target.fill(str(value))
        target.press('Tab')

    def point(self, x, y):
        return self.page.evaluate('''([x,y])=>{const b=document.querySelector('#view').getBoundingClientRect(),cam=CodaArcadeQA.camera();return {x:b.left+(x-cam.x)*cam.zoom*b.width/1672,y:b.top+(y-cam.y)*cam.zoom*b.height/941}}''', [x, y])

    def map_click(self, x, y):
        point = self.point(x, y)
        self.page.mouse.click(point['x'], point['y'])

    def lift(self):
        self.page.locator('#devCatalog').select_option('dance_right_couch')
        self.page.locator('#devLift').click()
        return self.project()['assets'][0]

    def import_project(self, data, accept=True):
        self.tab('project')
        if accept:
            self.page.once('dialog', lambda dialog: dialog.accept())
        self.page.locator('#devImportFile').set_input_files({'name':'project.json','mimeType':'application/json','buffer':json.dumps(data).encode()})

    def test_original_movement_resize_layers_replace_and_reload(self):
        # Decorative lighting is off for a meaningful source-patch pixel comparison.
        before = self.page.locator('#view').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(590,620,55,45).data)')
        original = self.lift()
        self.field('assetX', 1030)
        self.field('assetY', 600)
        self.page.wait_for_timeout(100)
        after = self.page.locator('#view').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(590,620,55,45).data)')
        self.assertGreater(sum(a != b for a,b in zip(before, after)), 1000, 'Old artwork must be patched, rather than duplicated')
        self.assertEqual(self.project()['assets'][0]['origin']['bounds'], original['origin']['bounds'])
        self.field('assetW', 240)
        asset = self.project()['assets'][0]
        self.assertAlmostEqual(asset['w'] / asset['h'], original['w'] / original['h'])
        self.page.locator('#assetLayer').select_option('front')
        self.assertEqual(self.project()['assets'][0]['layer'], 'front')
        # Drag, resize and rotate through the real canvas input handlers.
        self.page.locator('#assetStudio').evaluate('(el)=>el.scrollTop=0')
        p0, p1 = self.point(1030,600), self.point(1070,620)
        self.page.mouse.move(**p0)
        self.page.mouse.down()
        self.page.mouse.move(**p1, steps=5)
        self.page.mouse.up()
        asset = self.project()['assets'][0]
        self.assertNotEqual(asset['x'], 1030)
        corner = self.point(asset['x']+asset['w']/2, asset['y']+asset['h']/2)
        end = self.point(asset['x']+asset['w']/2+24, asset['y']+asset['h']/2+24)
        self.page.mouse.move(**corner);self.page.mouse.down();self.page.mouse.move(**end,steps=4);self.page.mouse.up()
        self.assertGreater(self.project()['assets'][0]['w'], asset['w'])
        self.assertAlmostEqual(self.project()['assets'][0]['w']/self.project()['assets'][0]['h'], asset['w']/asset['h'])
        self.field('assetRotate', 25)
        self.page.locator('#devSolid').check()
        self.assertIn('collider', self.project()['assets'][0])
        # Replacement keeps placement and the original cleanup ownership.
        png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFOkAAAAASUVORK5CYII=')
        self.page.locator('#devReplaceFile').set_input_files({'name':'replacement.png','mimeType':'image/png','buffer':png})
        self.page.wait_for_function('CodaDeveloperConsole.getProject().assets[0].kind==="image"')
        self.assertIn('origin', self.project()['assets'][0])
        # Duplicate must detach ownership; saving it must remain valid on reload.
        self.page.locator('#assetDuplicate').click()
        self.assertNotIn('origin', self.project()['assets'][1])
        expected = self.project()
        self.assertTrue(self.page.evaluate('CodaDeveloperConsole.save()'))
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('CodaDeveloperConsole.ready()')
        self.assertEqual(self.project(), expected)

    def test_collision_layers_history_export_import_and_rejection(self):
        self.tab('collision')
        # This is an original structural wall, formerly impossible to open.
        self.assertFalse(self.page.evaluate('CodaArcadeQA.walkable(835,715)'))
        self.page.get_by_label('Collision tool', exact=True).select_option('open')
        self.map_click(835,715)
        self.assertTrue(self.page.evaluate('CodaArcadeQA.walkable(835,715)'))
        self.assertTrue(self.page.evaluate('CodaArcadeQA.route(835,715,835,715).length>0'))
        self.page.locator('#devUndo').click()
        self.assertFalse(self.page.evaluate('CodaArcadeQA.walkable(835,715)'))
        self.page.locator('#devRedo').click()
        self.assertTrue(self.page.evaluate('CodaArcadeQA.walkable(835,715)'))
        self.page.get_by_label('Collision tool', exact=True).select_option('block')
        self.map_click(1185,395)
        self.assertFalse(self.page.evaluate('CodaArcadeQA.walkable(1185,395)'))
        self.tab('layers')
        self.map_click(1000,500)
        self.assertEqual(len(self.project()['strokes']), 1)
        self.page.locator('#devLayerTool').select_option('erase')
        self.map_click(1000,500)
        self.assertEqual(self.project()['strokes'][-1]['tool'], 'erase')
        self.page.locator('#devUndo').click()
        self.assertEqual(len(self.project()['strokes']), 1)
        # Even a footprint narrower than a navigation cell must divert routes.
        self.tab('objects')
        self.page.locator('#assetPreset').click()
        self.page.locator('#assetAnim').select_option('none')
        for name,value in [('assetX',1230.5),('assetY',605),('assetW',100)]:
            self.field(name,value)
        self.page.locator('#devSolid').check()
        for name,value in [('devColX',0),('devColY',-25),('devColW',1),('devColH',50)]:
            self.field(name,value)
        self.assertFalse(self.page.evaluate('CodaArcadeQA.walkable(1231,605)'))
        route = self.page.evaluate('CodaArcadeQA.route(1185,605,1285,605)')
        self.assertGreater(len(route), 1, 'Thin collision must divert navigation rather than be skipped')
        expected = self.project()
        self.tab('project')
        with self.page.expect_download() as download:
            self.page.locator('#devExport').click()
        exported = json.loads(Path(download.value.path()).read_text())
        self.assertEqual(exported, expected)
        invalid = json.loads(json.dumps(expected))
        invalid['collision'].append(invalid['collision'][0])
        self.import_project(invalid, accept=False)
        self.page.wait_for_function('document.querySelector("#devStatus").textContent.startsWith("Import failed:")')
        self.assertEqual(self.project(), expected, 'Rejected imports must leave all edits intact')
        self.page.once('dialog', lambda d:d.accept())
        self.page.locator('#devReset').click()
        self.assertEqual(self.project()['collision'], [])
        self.import_project(exported)
        self.page.wait_for_function('CodaDeveloperConsole.getProject().strokes.length===1')
        self.assertEqual(self.project(), expected)
        self.page.locator('#devUndo').click()
        self.assertEqual(self.project()['collision'], [], 'One undo must revert the entire import')

    def test_delete_restore_typing_shortcuts_playtest_and_zoom(self):
        original = self.lift()
        self.field('assetName', 'wasd c l f')
        self.assertTrue(self.page.locator('#assetStudio').is_visible())
        self.assertEqual(self.project()['assets'][0]['name'], 'wasd c l f')
        self.page.locator('#assetRemove').click()
        self.assertFalse(self.project()['assets'][0]['visible'], 'Deleting an original must keep its source removed')
        self.page.locator('#devUndo').click()
        self.assertTrue(self.project()['assets'][0]['visible'])
        self.page.locator('#devRestore').click()
        self.assertEqual(self.project()['assets'], [])
        self.page.locator('#devUndo').click()
        self.page.locator('#devPlaytest').click()
        before = self.page.evaluate('CodaArcadeQA.position()')
        self.page.keyboard.down('d');self.page.wait_for_timeout(250);self.page.keyboard.up('d')
        after = self.page.evaluate('CodaArcadeQA.position()')
        self.assertGreater(after['x'], before['x'], 'Playtest must resume actual movement')
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.locator('#devPlaytest').get_attribute('aria-pressed'), 'false')
        self.page.keyboard.press('F2')
        self.page.keyboard.press('Shift+L')
        self.assertTrue(self.page.locator('#dev-layers').is_visible())
        self.assertFalse(self.page.locator('#layerEditor').is_visible(), 'Legacy layer pane must not bypass project history')
        self.page.keyboard.press('F2')
        self.page.keyboard.press('c')
        self.assertTrue(self.page.locator('#dev-collision').is_visible())
        # Zoom and edit the same world cell through the shared camera transform.
        self.page.evaluate('CodaArcadeQA.setZoom(2)')
        self.page.wait_for_function('CodaArcadeQA.camera().zoom>1.99')
        self.page.get_by_label('Collision tool', exact=True).select_option('open')
        self.map_click(1105,395)
        self.assertTrue(any(i == 39*168+110 and v == 1 for i,v in self.project()['collision']))
        self.tab('objects')
        pixel = self.page.evaluate('''()=>{for(let y=450;y<525;y+=5)for(let x=1150;x<1210;x+=5)if(CodaArcadeQA.foregroundPixelAlpha('main_counter_left_palm',x,y)>200)return [x,y]}''')
        self.assertIsNotNone(pixel)
        camera_before = self.page.evaluate('CodaArcadeQA.camera()')
        # Target the pixel center rather than an alpha edge while zoom settles.
        self.map_click(pixel[0]+.5, pixel[1]+.5)
        self.assertEqual(self.project()['assets'][-1]['origin']['name'], 'main_counter_left_palm')
        self.assertIsNotNone(self.page.evaluate('CodaAssetStudioQA.get().selected'))
        self.assertAlmostEqual(self.page.evaluate('CodaArcadeQA.camera().x'), camera_before['x'], delta=2, msg='Canvas selection must not recenter before its drag begins')


if __name__ == '__main__':
    unittest.main(verbosity=2)
