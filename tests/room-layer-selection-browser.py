"""Exact selection fills use the live room layer compositor, history, and portable data."""
from pathlib import Path
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class RoomLayerSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1100, 'height': 1000})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))
        self.page.set_content('''<style>body{margin:0}canvas{display:block;width:400px;height:300px;touch-action:none}.room-dev-console{width:800px}label{display:block}</style><section id="room"><header></header><canvas id="scene" width="400" height="300" tabindex="0"></canvas></section>''')
        for script in ['pixel-selection.js', 'layer-selection.js', 'room-developer-editor.js']:
            self.page.add_script_tag(path=str(ROOT / script))
        self.page.evaluate('''()=>{
          window.saved={};window.allowed=true;window.changes=0;
          const canvas=document.querySelector('#scene'),background=document.createElement('canvas');
          background.width=400;background.height=300;const bg=background.getContext('2d');bg.fillStyle='#667788';bg.fillRect(0,0,400,300);
          window.startEditor=()=>{window.editor=createCodaRoomDeveloperEditor({id:'selection-test',name:'Selection test',host:document.querySelector('#room'),canvas,width:400,height:300,getBackground:()=>background,canEdit:()=>allowed,storage:{getItem:key=>saved[key]??null,setItem:(key,value)=>saved[key]=value},onProjectChange:()=>changes++});editor.open('layers');};
          window.render=()=>{const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,400,300);editor.beforeScene(ctx);ctx.drawImage(background,0,0);editor.afterBackground(ctx,300);ctx.fillStyle='#1234ef';ctx.fillRect(150,100,100,100);editor.afterScene(ctx,300);};
          window.pixel=(x,y)=>{render();return [...canvas.getContext('2d').getImageData(x,y,1,1).data];};startEditor();
        }''')
        self.page.locator('[data-room-action="show-layers"]').click()
        self.page.evaluate('''async()=>{const c=document.createElement('canvas');c.width=c.height=8;const g=c.getContext('2d');g.fillStyle='#ee09ce';g.fillRect(0,0,8,8);const p=editor.getProject();p.assets=[{id:'witness',name:'Mask witness',x:200,y:150,w:100,h:100,visible:true,layer:'background',data:c.toDataURL()}];editor.applyProject(p);await editor.getArtworkSource('room.selection-test.asset.witness');render();}''')

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.context.close()

    def action(self, name):
        return self.page.locator('[data-room-action="'+name+'"]')

    def state(self):
        return self.page.evaluate('editor.getState()')

    def project(self):
        return self.page.evaluate('editor.getProject()')

    def pixel(self, x, y):
        return self.page.evaluate('([x,y])=>pixel(x,y)', [x,y])

    def point(self, x, y):
        box=self.page.locator('#scene').bounding_box()
        camera=self.state()['camera']
        return {'x':box['x']+(x+.1-camera['x'])*camera['zoom']*box['width']/400,
                'y':box['y']+(y+.1-camera['y'])*camera['zoom']*box['height']/300}

    def rectangle(self, x0, y0, x1, y1):
        self.action('layer-select').click()
        self.page.mouse.move(**self.point(x0,y0))
        self.page.mouse.down()
        self.page.mouse.move(**self.point(x1,y1), steps=4)
        self.page.mouse.up()
        self.page.mouse.move(1,1)

    def test_rectangle_fill_is_exact_one_undo_step_and_erase_uses_same_selection(self):
        before=self.project()
        self.rectangle(179,129,220,170)
        self.assertEqual(self.project(),before,'Selecting is not a saved artwork edit')
        self.assertEqual(self.state()['undo'],0)
        self.assertEqual(self.state()['layerSelection']['selection'],{'x':179,'y':129,'width':42,'height':42})
        self.action('layer-fill').click()
        self.assertEqual(self.state()['undo'],1)
        self.assertEqual(len(self.project()['strokes']),1)
        self.assertEqual(self.project()['strokes'][0]['selection'],self.state()['layerSelection']['selection'])
        # Hide the ephemeral selection to inspect the actual compositing result.
        self.page.evaluate("editor.open('objects')")
        self.assertEqual(self.pixel(190,140),[238,9,206,255])
        self.assertEqual(self.pixel(178,140),[18,52,239,255])
        self.assertEqual(self.pixel(221,140),[18,52,239,255])
        self.action('undo').click()
        self.assertEqual(self.pixel(190,140),[18,52,239,255])
        self.action('redo').click()
        self.assertEqual(self.pixel(190,140),[238,9,206,255])
        self.page.evaluate("editor.open('layers')")
        self.action('show-layers').click()
        self.page.locator('[data-room-field="layer-tool"]').select_option('erase')
        self.action('layer-fill').click()
        self.assertEqual(self.state()['undo'],2)
        self.assertEqual(self.project()['strokes'][-1]['tool'],'erase')
        self.page.evaluate("editor.open('objects')")
        self.assertEqual(self.pixel(190,140),[18,52,239,255])

    def test_manual_concave_shape_fills_geometry_and_escape_cancels_without_edit(self):
        self.page.locator('[data-room-field="layer-selection-shape"]').select_option('manual')
        for x,y in [(170,120),(230,120),(230,140),(190,140),(190,180),(170,180)]:
            self.page.mouse.click(**self.point(x,y))
        self.assertTrue(self.action('layer-fill').is_disabled())
        self.assertEqual(self.project()['strokes'],[])
        self.page.locator('#scene').focus()
        self.page.keyboard.press('Enter')
        self.assertTrue(self.action('layer-fill').is_enabled())
        self.action('layer-fill').click()
        self.page.evaluate("editor.open('objects')")
        self.assertEqual(self.pixel(180,170),[238,9,206,255])
        self.assertEqual(self.pixel(220,130),[238,9,206,255])
        self.assertEqual(self.pixel(220,170),[18,52,239,255],'The concave cutout remains behind the actor')
        self.page.evaluate("editor.open('layers')")
        before=self.project()
        self.page.mouse.click(**self.point(200,150))
        self.page.mouse.click(**self.point(210,160))
        self.page.keyboard.press('Escape')
        self.assertTrue(self.state()['open'])
        self.assertIsNone(self.state()['layerSelection']['draft'])
        self.assertEqual(self.project(),before)

    def test_fill_round_trips_storage_export_and_rejects_invalid_selection(self):
        self.rectangle(185,135,215,165)
        self.action('layer-fill').click()
        expected=self.project()
        self.assertTrue(self.page.evaluate('p=>CodaRoomDeveloperEditor.validateProject(p,400,300)',expected))
        invalid=self.project();invalid['strokes'][0]['selection']['width']=400
        self.assertFalse(self.page.evaluate('p=>editor.applyProject(p)',invalid))
        self.assertEqual(self.project(),expected)
        self.page.evaluate("editor.open('project')")
        with self.page.expect_download() as info:
            self.action('export').click()
        import json
        exported=json.loads(Path(info.value.path()).read_text())
        self.assertEqual(exported['strokes'],expected['strokes'])
        self.page.evaluate("editor.destroy();startEditor();editor.open('objects')")
        self.assertEqual(self.project(),expected)
        self.action('show-layers').click()
        self.page.evaluate("editor.getArtworkSource('room.selection-test.asset.witness')")
        self.page.wait_for_function("editor.getArtworkSource('room.selection-test.asset.witness')?.complete")
        self.assertEqual(self.pixel(200,150),[238,9,206,255])

    def test_zoomed_panned_selection_and_pointer_cancel_preserve_project(self):
        before=self.project()
        for _ in range(4):self.action('zoom-in').click()
        start=self.point(190,140)
        self.page.mouse.move(**start)
        self.page.mouse.down(button='right')
        self.page.mouse.move(start['x']-20,start['y']-20)
        self.page.mouse.up(button='right')
        self.rectangle(170,130,220,170)
        selected=self.state()['layerSelection']['selection']
        self.assertEqual(selected,{'x':170,'y':130,'width':51,'height':41})
        self.assertEqual(self.project(),before)
        self.page.mouse.move(**self.point(180,140))
        self.page.mouse.down()
        self.page.mouse.move(**self.point(200,160))
        self.page.locator('#scene').dispatch_event('pointercancel',{'pointerId':1})
        self.page.mouse.up()
        self.assertEqual(self.state()['layerSelection']['selection'],selected)
        self.assertIsNone(self.state()['layerSelection']['draft'])
        self.assertEqual(self.state()['undo'],0)
        self.assertEqual(self.project(),before)

    def test_fill_is_disabled_for_playtest_and_revoked_edit_access(self):
        self.rectangle(180,130,220,170)
        before=self.project()
        self.action('playtest').click()
        self.assertTrue(self.action('layer-fill').is_disabled())
        self.assertEqual(self.project(),before)
        self.page.locator('#scene').focus()
        self.page.keyboard.press('Escape')
        self.assertTrue(self.state()['editing'],'Escape still exits playtest with a retained selection')
        self.page.evaluate('allowed=false')
        # A synthetic click exercises the mutation gate as well as button state.
        self.action('layer-fill').dispatch_event('click')
        self.assertEqual(self.project(),before)


if __name__=='__main__':
    unittest.main(verbosity=2)
