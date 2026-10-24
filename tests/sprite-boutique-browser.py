"""Exercise actual raster character assets and independent wardrobe layers.

Starts a temporary server and uses disposable Chromium profiles. Requires the
environment's Python Playwright package and Chromium; no external service access.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import unittest
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass


class SpriteBoutiqueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever,daemon=True).start()
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/world-preview.html'
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop();cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':1600,'height':1000})
        self.context.route('https://**/*',lambda route:route.abort())
        self.page=self.context.new_page();self.page.set_default_timeout(10000)
        self.errors=[];self.local_failures=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))
        self.page.on('console',lambda message:self.errors.append(message.text) if 'Arcade frame error:' in message.text else None)
        self.page.on('response',lambda response:self.local_failures.append(response.url) if response.status>=400 and '127.0.0.1' in response.url and not response.url.endswith('favicon.ico') else None)
        self.load()
        # The shipped FX switch keeps expensive room lights out of visual checks.
        for _ in range(3):
            if self.page.locator('#fxBtn').inner_text().endswith('Off'):
                break
            self.page.locator('#fxBtn').click()
        self.assertTrue(self.page.locator('#fxBtn').inner_text().endswith('Off'))

    def tearDown(self):
        errors,failures=self.errors[:],self.local_failures[:]
        self.context.close()
        self.assertEqual(errors,[],'Character page/frame errors')
        self.assertEqual(failures,[],'Failed local character resources')

    def load(self):
        self.page.goto(self.url,wait_until='domcontentloaded')
        self.page.wait_for_function('window.CodaDeveloperConsole?.ready()')
        self.page.wait_for_function('window.CodaArcadeQA?.characters().spriteState?.ready===true',timeout=30000)

    def appearance(self,target='player'):
        return self.page.evaluate('''id=>{const characters=CodaArcadeQA.characters();return id==='player'?characters.player.appearance:characters.npcs.find(p=>p.id===id).appearance}''',target)

    def set_color(self,label,value):
        self.page.get_by_label(label,exact=True).evaluate('(input,value)=>{input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));}',value)

    def open_boutique(self,target='player'):
        self.page.locator('#avatarBtn').click()
        self.page.get_by_label('Customize',exact=True).select_option(target)
        self.page.locator('#avatarPreviewMode').select_option('idle')

    def test_raster_assets_render_detailed_directional_frames_and_walking_animation(self):
        state=self.page.evaluate('CodaArcadeQA.characters().spriteState')
        self.assertEqual(state['mode'],'raster-sprites');self.assertTrue(state['ready'])
        self.assertGreater(state['layers'],10);self.assertGreaterEqual(state['totalFrames'],100)
        self.open_boutique()
        views=self.page.locator('.avatar-preview-views canvas')
        self.assertEqual(views.count(),4)
        metrics=views.evaluate_all('''canvases=>canvases.map(canvas=>{
          const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          let visible=0,topEdge=0;const colors=new Set();
          for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200){visible++;colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);if(i<canvas.width*4)topEdge++;}
          return {visible,colors:colors.size,topEdge};
        })''')
        for view in metrics:
            self.assertGreater(view['visible'],150,'Loaded sprite must contain visible artwork')
            self.assertGreater(view['colors'],24,'Sprite detail should retain authored shading')
            self.assertEqual(view['topEdge'],0,'Preview must fit the full head and hair, without clipping')
        self.assertGreater(len(set(views.evaluate_all('(canvases)=>canvases.map(canvas=>canvas.toDataURL())'))),2)
        self.page.locator('#avatarPreviewMode').select_option('walk')
        frames=[]
        for _ in range(5):
            frames.append(views.first.evaluate('(canvas)=>canvas.toDataURL()'))
            self.page.wait_for_timeout(160)
        self.assertGreater(len(set(frames)),1,'Walking must advance real raster frames')
        resources=self.page.evaluate('performance.getEntriesByType("resource").map(entry=>entry.name)')
        sprites=[urlparse(name) for name in resources if '/assets/characters/' in name]
        self.assertTrue(any(resource.path.endswith('/manifest.json') for resource in sprites),'The sprite manifest must be loaded')
        self.assertTrue(any(resource.path.endswith('.png') for resource in sprites),'Raster sprite layers must be loaded')
        for resource in sprites:
            if resource.path.endswith(('/manifest.json','.png')):
                self.assertEqual(parse_qs(resource.query).get('v'),['classic-15'],resource.geturl())

    def test_original_arcade_look_previews_before_save_and_persists_after_reload(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.page.evaluate('''localStorage.setItem("musicArcadeV1",JSON.stringify({name:"Preset Keeper",walked:600,collectedTokens:7,
          hairstyle:"buns",hair:"#ece4d6",skin:"#704633",outfit:"overalls",shirt:"#4678ab",lowerColor:"#334c72",
          headwear:"none",eyewear:"sunglasses",accessory:"headphones",shoes:"boots",emote:"dance"}))''')
        self.load();before=self.appearance()
        raw_before=self.page.evaluate('localStorage.getItem("musicArcadeV1")')
        self.open_boutique()
        preview=self.page.locator('.avatar-preview-views canvas').first
        self.page.wait_for_function('''()=>{const canvas=document.querySelector('.avatar-preview-views canvas');
          return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4===3&&value>0)}''')
        before_pixels=preview.evaluate('(canvas)=>canvas.toDataURL()')
        self.page.get_by_role('button',name='Original arcade look',exact=True).click()
        self.page.wait_for_function('''before=>document.querySelector('.avatar-preview-views canvas').toDataURL()!==before''',arg=before_pixels)
        for label,value in {'Hairstyle':'short','Hair color':'#171424','Skin color':'#e5ad75','Outfit':'pants','Outfit color':'#e94038',
                            'Lower clothing color':'#235cb9','Hats':'cap','Glasses':'none','Accessories':'none','Shoes':'sneakers','Emote':'wave'}.items():
            self.assertEqual(self.page.get_by_label(label,exact=True).input_value(),value,label)
        self.assertEqual(self.page.get_by_label('Arcade nickname',exact=True).input_value(),'Preset Keeper')
        self.assertEqual(self.appearance(),before,'The preset must remain a draft until Save')
        self.assertEqual(self.page.evaluate('localStorage.getItem("musicArcadeV1")'),raw_before)
        self.page.get_by_role('button',name='Save my look',exact=True).click()
        saved=self.appearance()
        for field,value in {'name':'Preset Keeper','hairstyle':'short','hair':'#171424','skin':'#e5ad75','outfit':'pants','shirt':'#e94038',
                            'lowerColor':'#235cb9','headwear':'cap','eyewear':'none','accessory':'none','shoes':'sneakers','emote':'wave'}.items():
            self.assertEqual(saved[field],value,field)
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.musicArcadeV1).collectedTokens'),7)
        self.load();self.assertEqual(self.appearance(),saved)

    def test_player_can_save_hat_glasses_accessory_and_colors_together(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.page.evaluate('localStorage.setItem("musicArcadeV1",JSON.stringify({name:"Guest",walked:600,collectedTokens:7}))')
        self.load();self.open_boutique()
        self.page.get_by_label('Arcade nickname',exact=True).fill('Layered Player')
        self.page.get_by_label('Hairstyle',exact=True).select_option('buns')
        self.page.get_by_label('Outfit',exact=True).select_option('overalls')
        self.page.get_by_label('Hats',exact=True).select_option('cap')
        self.page.get_by_label('Glasses',exact=True).select_option('sunglasses')
        self.page.get_by_label('Accessories',exact=True).select_option('headphones')
        self.set_color('Skin color','#704633');self.set_color('Hair color','#ece4d6')
        self.set_color('Outfit color','#4678ab');self.set_color('Lower clothing color','#334c72')
        self.assertNotEqual(self.appearance()['headwear'],'cap','Draft equipment must not apply before Save')
        self.page.get_by_role('button',name='Save my look',exact=True).click()
        saved=self.appearance()
        for field,value in {'name':'Layered Player','hairstyle':'buns','outfit':'overalls','headwear':'cap','eyewear':'sunglasses','accessory':'headphones','skin':'#704633','hair':'#ece4d6','shirt':'#4678ab','lowerColor':'#334c72'}.items():
            self.assertEqual(saved[field],value,field)
        self.assertEqual(self.page.evaluate('JSON.parse(localStorage.musicArcadeV1).collectedTokens'),7)
        self.load();self.assertEqual(self.appearance(),saved)
        self.open_boutique()
        self.assertEqual(self.page.get_by_label('Hats',exact=True).input_value(),'cap')
        self.assertEqual(self.page.get_by_label('Glasses',exact=True).input_value(),'sunglasses')
        self.assertEqual(self.page.get_by_label('Accessories',exact=True).input_value(),'headphones')

    def test_npc_costume_persists_without_changing_identity_or_player(self):
        self.page.emulate_media(reduced_motion='reduce')
        player_before=self.appearance();self.open_boutique('miles')
        self.assertFalse(self.page.get_by_label('Arcade nickname',exact=True).is_editable())
        self.assertEqual(self.page.get_by_label('Arcade nickname',exact=True).input_value(),'Miles Davis')
        self.page.get_by_label('Outfit',exact=True).select_option('coat')
        self.page.get_by_label('Hats',exact=True).select_option('beanie')
        self.page.get_by_label('Glasses',exact=True).select_option('partyglasses')
        self.page.get_by_label('Accessories',exact=True).select_option('headphones')
        self.set_color('Outfit color','#91558d');self.set_color('Lower clothing color','#273f59')
        self.page.get_by_role('button',name='Save NPC look',exact=True).click()
        saved=self.appearance('miles')
        self.assertEqual((saved['outfit'],saved['headwear'],saved['eyewear'],saved['accessory']),('coat','beanie','partyglasses','headphones'))
        self.assertEqual((saved['shirt'],saved['lowerColor']),('#91558d','#273f59'))
        self.assertEqual(self.appearance(),player_before)
        self.load()
        self.assertEqual(self.appearance('miles'),saved)
        identity=self.page.evaluate('CodaArcadeQA.characters().npcs.find(p=>p.id==="miles")')
        self.assertEqual((identity['id'],identity['name']),('miles','Miles Davis'))
        self.open_boutique('miles')
        self.assertEqual(self.page.get_by_label('Hats',exact=True).input_value(),'beanie')
        self.assertEqual(self.page.get_by_label('Glasses',exact=True).input_value(),'partyglasses')
        self.assertEqual(self.page.get_by_label('Accessories',exact=True).input_value(),'headphones')

    def test_cancel_and_target_switch_discard_drafts(self):
        self.page.emulate_media(reduced_motion='reduce')
        before=self.appearance();npc_before=self.appearance('miles')
        raw_before=self.page.evaluate('localStorage.getItem("musicArcadeV1")')
        self.open_boutique()
        self.page.get_by_label('Hats',exact=True).select_option('crown')
        self.page.get_by_label('Glasses',exact=True).select_option('glasses')
        self.set_color('Skin color','#52372a')
        self.page.get_by_label('Customize',exact=True).select_option('miles')
        self.page.get_by_label('Outfit',exact=True).select_option('dress')
        self.page.get_by_label('Customize',exact=True).select_option('player')
        self.assertEqual(self.page.get_by_label('Hats',exact=True).input_value(),before['headwear'])
        self.page.get_by_role('button',name='Cancel',exact=True).click()
        self.assertFalse(self.page.locator('#panel').is_visible())
        self.assertEqual(self.appearance(),before);self.assertEqual(self.appearance('miles'),npc_before)
        self.assertEqual(self.page.evaluate('localStorage.getItem("musicArcadeV1")'),raw_before)


if __name__=='__main__':
    unittest.main(verbosity=2)
