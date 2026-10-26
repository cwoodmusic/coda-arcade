"""Actual renderer pixels for the shared character/artwork adapter.

Uses a disposable Chromium context and local scripts; external services blocked.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path != '/character-artwork-fixture':
            return super().do_GET()
        html = '''<!doctype html><title>Character artwork fixture</title>
        <script src="character-renderer.js"></script><script src="pixel-editor.js"></script>
        <script src="artwork-editor.js"></script><script src="character-artwork-adapter.js"></script>
        <script>
        window.renderer=createCodaCharacterRenderer();window.sprites={};
        window.adapter=CodaCharacterArtworkAdapter.create({renderer,getSprites:()=>sprites,
          setSprites:next=>{sprites=next;return renderer.setPixelEdits(next);},
          getTargets:()=>[{id:'player',name:'Your avatar'},{id:'haydn',name:'Professor Haydn'}]});
        window.framePixel=(target,x,y,facing='down',options={})=>Array.from(
          renderer.renderPixelFrame(target,{}, {facing},0,options).getContext('2d').getImageData(x,y,1,1).data);
        </script>'''
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode())


class CharacterArtworkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0),
            functools.partial(Handler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium',
            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context()
        self.context.route('https://**/*', lambda route: route.abort())
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/character-artwork-fixture')
        self.page.wait_for_function('window.adapter&&window.renderer')

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_rgba_overrides_replace_the_original_character_pixel_in_every_facing(self):
        result = self.page.evaluate('''()=>{
          const source=framePixel('player',40,45),data={};
          for(const facing of ['down','left','up','right'])
            data['character.player.'+facing]=CodaArtworkEditor.changePixels({},'test',80,96,
              [[40,45]],'#11223380').test;
          adapter.onChange(data);
          const pixels=['down','left','up','right'].map(facing=>framePixel('player',40,45,facing));
          const baseline=Array.from(adapter.getSource('character.player.down')
            .getContext('2d').getImageData(40,45,1,1).data);
          return {source,pixels,baseline,stored:sprites.player.down[0]};
        }''')
        self.assertEqual(result['source'][3], 255)
        self.assertEqual(result['baseline'], result['source'],
                         'The source must remain unmodified for Restore and future edits')
        self.assertEqual(result['stored'], [40,45,'#11223380'])
        for pixel in result['pixels']:
            self.assertEqual(pixel[3], 128,
                             'Partial alpha replaces the old pixel rather than tinting over it')
            for actual, expected in zip(pixel[:3], [17,34,51]):
                self.assertLessEqual(abs(actual-expected), 1)

    def test_restoring_character_art_preserves_animation_and_other_character_views(self):
        result = self.page.evaluate('''()=>{
          const data={
            'character.player.down':CodaArtworkEditor.changePixels({},'test',80,96,[[40,45]],'#ff00ffff').test,
            'character.haydn.up':CodaArtworkEditor.changePixels({},'test',80,96,[[40,45]],'#00000000').test
          };
          adapter.setData(data);
          const signature=phase=>Array.from(renderer.renderPixelFrame('player',{},
            {facing:'down',walking:true,phase},0).getContext('2d').getImageData(0,0,80,96).data).join(',');
          const animated=signature(.1)!==signature(1.6),painted=framePixel('player',40,45),
            erased=framePixel('haydn',40,45,'up'),kept=adapter.getData();
          delete kept['character.player.down'];adapter.setData(kept);
          return {animated,painted,erased,restored:framePixel('player',40,45),
            original:framePixel('player',40,45,'down',{base:true}),sprites};
        }''')
        self.assertTrue(result['animated'])
        self.assertEqual(result['painted'], [255,0,255,255])
        self.assertEqual(result['erased'][3], 0)
        self.assertEqual(result['restored'], result['original'])
        self.assertEqual(result['sprites'], {'haydn':{'up':[[40,45,None]]}})


if __name__ == '__main__':
    unittest.main(verbosity=2)
