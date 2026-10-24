"""Rendering-work regressions, independent of the machine's achieved frame rate.

The moving world must not redraw blurred note rectangles on the main canvas;
paused modal backdrops must not compete with live character previews.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class AnimationPerformanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path='/usr/bin/chromium', args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1600,'height':1000})
        self.context.route('https://**/*', lambda route:route.abort())
        self.context.add_init_script('''(()=>{
          const fill=CanvasRenderingContext2D.prototype.fillRect;
          window.renderWork={worldDraws:0,blurredWorldRects:0};
          CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
            if(this.canvas.id==='view'){
              if(x===0&&y===0&&w===1672&&h===941)renderWork.worldDraws++;
              if(this.shadowBlur>0)renderWork.blurredWorldRects++;
            }
            return fill.call(this,x,y,w,h);
          };
          window.displayFrames=count=>new Promise(resolve=>{
            const next=()=>{if(--count<=0)resolve();else requestAnimationFrame(next);};
            requestAnimationFrame(next);
          });
        })()''')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/world-preview.html',
                       wait_until='domcontentloaded')
        self.page.wait_for_function('window.CodaArcadeQA?.characters().spriteState.ready')

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_full_lighting_reuses_small_glowing_note_and_soft_light_surfaces(self):
        self.assertEqual(self.page.locator('#fxBtn').inner_text(), '✧ FX: Full')
        self.page.evaluate('displayFrames(24)')
        self.page.evaluate('renderWork.blurredWorldRects=0')
        self.page.evaluate('displayFrames(24)')
        result = self.page.evaluate('({work:renderWork,...CodaArcadeQA.atmosphere()})')
        self.assertEqual(result['work']['blurredWorldRects'], 0,
                         'Speaker notes must use cached glyphs, not live per-rectangle blur passes')
        self.assertGreater(result['musicNotesCached'], 0)
        self.assertLessEqual(result['musicNotesCached'], 8,
                             'Four speaker colors each need at most two glyphs')
        light = result['ambientRaster']
        self.assertLessEqual(light['width']*light['height'], 1672*941/8,
                             'Soft lighting must not repaint a full-resolution world surface')

    def test_paused_world_backdrop_stays_still_while_the_boutique_keeps_animating(self):
        self.page.locator('#avatarBtn').click()
        self.page.evaluate('displayFrames(3)')
        views = self.page.locator('.avatar-preview-views canvas')
        self.assertEqual(views.count(), 4)
        before = views.first.evaluate('(canvas)=>canvas.toDataURL()')
        draws = self.page.evaluate('renderWork.worldDraws')
        self.page.wait_for_function('''before=>
          document.querySelector('.avatar-preview-views canvas').toDataURL()!==before''',
                                   arg=before)
        self.assertEqual(self.page.evaluate('renderWork.worldDraws'), draws,
                         'A paused modal backdrop must not redraw lights or actors')
        self.page.locator('#fxBtn').click()
        self.page.wait_for_function('count=>renderWork.worldDraws>count', arg=draws)
        self.page.evaluate('displayFrames(3)')
        draws = self.page.evaluate('renderWork.worldDraws')
        self.page.evaluate('displayFrames(8)')
        self.assertEqual(self.page.evaluate('renderWork.worldDraws'), draws,
                         'A backdrop preference change refreshes once and then stays paused')
        self.page.get_by_role('button', name='Cancel', exact=True).click()
        self.page.wait_for_function('count=>renderWork.worldDraws>count', arg=draws)


if __name__ == '__main__':
    unittest.main(verbosity=2)
