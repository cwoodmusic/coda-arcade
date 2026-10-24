"""Exercise the real classroom DOM, canvas movement, books, and listening audio."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
    def do_GET(self):
        if self.path!='/classroom-harness':
            return super().do_GET()
        html='''<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/music-classroom.css"><link rel="stylesheet" href="/classroom-tutorials.css"><button id="entrance">Enter classroom</button><section id="room" hidden></section><script src="/character-renderer.js"></script><script src="/classroom-tutorials.js"></script><script src="/music-classroom.js"></script><script>window.roomUI=createCodaMusicClassroom({host:document.querySelector('#room'),backgroundSrc:'/assets/world/music-classroom-room.png',renderer:createCodaCharacterRenderer(),getAvatar:()=>({})});entrance.onclick=()=>roomUI.open();</script>'''
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(html.encode())

class ClassroomTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop();cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1200,'height':950})
        self.page=self.context.new_page();self.errors=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        base=f'http://127.0.0.1:{self.server.server_port}'
        self.page.goto(base+'/classroom-harness')
        self.page.wait_for_function('window.roomUI')
        self.page.locator('#entrance').click()

    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.context.close()

    def test_room_moves_and_professor_interaction_opens_a_real_book(self):
        self.assertTrue(self.page.evaluate('roomUI.getState().open'))
        self.page.locator('#classroomCanvas').focus();self.page.keyboard.down('w')
        self.page.wait_for_timeout(900);self.page.keyboard.up('w')
        state=self.page.evaluate('roomUI.getState()')
        self.assertLess(state['player']['y'],400)
        self.assertGreaterEqual(state['player']['y'],373,'The professor’s desk must block walking onto its surface')
        self.assertEqual(state['near']['type'],'professor')
        self.page.keyboard.press('e')
        self.assertEqual(self.page.locator('#classroomBookTitle').inner_text(),'Professor Haydn’s game guide')
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'classroomBook')

    def test_tapping_the_room_reaches_a_bookshelf_and_e_reads_it(self):
        box=self.page.locator('#classroomCanvas').bounding_box()
        self.page.mouse.click(box['x']+175/1000*box['width'],box['y']+315/600*box['height'])
        self.page.wait_for_function("roomUI.getState().near?.id==='pitch'",timeout=5000)
        self.page.wait_for_function("Math.abs(roomUI.getState().player.x-175)<5",timeout=5000)
        self.page.keyboard.press('e')
        self.assertIn(self.page.evaluate('roomUI.getState().topic'),['pitch','note-naming'])

    def test_books_search_quiz_audio_and_close_work(self):
        self.page.locator('#classroomSearch').fill('interval')
        self.page.locator('[data-topic="intervals"]').click()
        self.assertIn('Intervals higher',self.page.locator('#classroomBookTitle').inner_text())
        self.page.get_by_role('button',name='F',exact=True).click()
        self.assertEqual(self.page.locator('.classroom-feedback').get_attribute('data-correct'),'false')
        self.page.get_by_role('button',name='G',exact=True).click()
        self.assertEqual(self.page.locator('.classroom-feedback').get_attribute('data-correct'),'true')
        self.page.get_by_role('button',name='♫ Hear a major third up',exact=True).click()
        self.assertTrue(self.page.evaluate('roomUI.getState().audioPlaying'))
        self.page.keyboard.press('Escape')
        self.assertFalse(self.page.evaluate('roomUI.getState().open'))
        self.assertFalse(self.page.evaluate('roomUI.getState().audioPlaying'))
        self.assertTrue(self.page.locator('#room').is_hidden())
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'entrance')

    def test_books_remain_accessible_at_phone_width(self):
        self.page.set_viewport_size({'width':375,'height':812})
        self.page.get_by_role('button',name='Study books',exact=True).click()
        self.page.locator('#classroomSearch').fill('Music Triad')
        self.page.locator('[data-topic="music-triad"]').click()
        book=self.page.locator('#classroomBook').inner_text()
        self.assertIn('Notes battle notes',book)
        self.assertIn('Rests battle rests',book)
        overflow=self.page.evaluate('document.querySelector("#room").scrollWidth>innerWidth')
        self.assertFalse(overflow,'Study books should fit a phone viewport')

if __name__=='__main__':
    unittest.main(verbosity=2)
