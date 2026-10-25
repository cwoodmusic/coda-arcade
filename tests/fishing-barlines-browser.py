"""Check visible measure dividers against real meter and changing-tempo clocks."""
import importlib.util
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode = True
_spec=importlib.util.spec_from_file_location('fishing_bar_tempo',Path(__file__).with_name('fishing-tempo-browser.py'))
_tempo=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_tempo)
_base=_tempo.FishingTempoTests


class FishingBarLineTests(_tempo._upgrade._fish._world.WorldBrowserCase):
    portal=_base.portal
    place=_base.place
    enter=_base.enter
    walk_to=_base.walk_to
    board=_base.board
    start_exploring=_base.start_exploring
    place_single_fish=_base.place_single_fish
    state=_base.state
    choose=_base.choose
    begin_fish=_base.begin_fish
    time_at_beat=_base.time_at_beat
    advance_to=_base.advance_to
    tap_next=_base.tap_next
    play_through_beat=_base.play_through_beat
    cancel=_base.cancel

    def setUp(self):
        _tempo.FishingTempoTests.setUp(self)
        self.page.evaluate('''()=>{
          window.measureInk=[];window.measureLabels=[];
          const Proto=CanvasRenderingContext2D.prototype,paths=new WeakMap();
          const begin=Proto.beginPath,move=Proto.moveTo,line=Proto.lineTo,stroke=Proto.stroke,text=Proto.fillText;
          Proto.beginPath=function(...args){paths.set(this,[]);return begin.apply(this,args);};
          Proto.moveTo=function(x,y){paths.set(this,[[x,y]]);return move.call(this,x,y);};
          Proto.lineTo=function(x,y){paths.get(this)?.push([x,y]);return line.call(this,x,y);};
          Proto.stroke=function(...args){
            const points=paths.get(this);
            if(this.canvas.id==='fishingRhythmCanvas'&&points?.length===2&&
              points[0][0]===points[1][0]&&Math.abs(points[1][1]-points[0][1])===54){
              measureInk.push({x:points[0][0],top:points[0][1],bottom:points[1][1],
                width:this.lineWidth,color:this.strokeStyle,alpha:this.globalAlpha,
                clock:CodaArcadeQA.fishing().clock});
              if(measureInk.length>500)measureInk.shift();
            }
            return stroke.apply(this,args);
          };
          Proto.fillText=function(value,x,y,...args){
            if(this.canvas.id==='fishingRhythmCanvas'&&/^Bar [0-9]+$/.test(String(value))){
              const bounds=this.measureText(String(value));
              measureLabels.push({text:String(value),x,y,
                top:y-bounds.actualBoundingBoxAscent,bottom:y+bounds.actualBoundingBoxDescent,
                left:x-bounds.actualBoundingBoxLeft,right:x+bounds.actualBoundingBoxRight,
                clock:CodaArcadeQA.fishing().clock});
              if(measureLabels.length>500)measureLabels.shift();
            }
            return text.call(this,value,x,y,...args);
          };
        }''')

    def assert_bars(self,meter):
        state=self.state();drawing=state['beaming'];style=drawing['barLineStyle']
        self.assertEqual(style['color'],'#b8dcf0')
        self.assertEqual(style['width'],2)
        self.assertEqual(style['bottom']-style['top'],54)
        self.assertAlmostEqual(drawing['currentBeat'],state['challenge']['beat'],places=8)
        self.assertTrue(drawing['barLines'],'A visible staff must show the next measure boundary')
        bar_beats=3 if meter=='6/8' else 4
        canvas_width=self.page.locator('#fishingRhythmCanvas').evaluate('c=>c.width')
        expected=[line for line in state['challenge']['barLines'] if
            55<=drawing['strike']+(line['beat']-drawing['currentBeat'])*drawing['spacing']<=canvas_width]
        self.assertEqual(len(drawing['barLines']),len(expected))
        actual=self.page.evaluate('time=>measureInk.filter(line=>Math.abs(line.clock-time)<1e-8)',state['clock'])
        self.assertEqual(len(actual),len(expected))
        for line,planned in zip(drawing['barLines'],expected):
            self.assertAlmostEqual(line['beat'],line['bar']*bar_beats,places=8)
            self.assertEqual(line['bar'],planned['bar'])
            self.assertAlmostEqual(line['x'],drawing['strike']+
                (line['beat']-drawing['currentBeat'])*drawing['spacing'],places=7)
            ink=min(actual,key=lambda stroke:abs(stroke['x']-line['x']))
            self.assertAlmostEqual(ink['x'],line['x'],places=7)
            self.assertEqual(ink['width'],2);self.assertEqual(ink['color'],'#b8dcf0')
            if line['x']>drawing['strike']:self.assertGreaterEqual(ink['alpha'],.89)
            if line['label']:
                self.assertGreater(line['x'],drawing['strike']+40)
                self.assertNotEqual(drawing['fontSize'],48,'Short screens omit measure labels')
                labels=self.page.evaluate('time=>measureLabels.filter(item=>Math.abs(item.clock-time)<1e-8)',state['clock'])
                self.assertTrue(any(item['text']==line['label'] and abs(item['x']-line['x'])<1e-8 for item in labels))
        visible=next(line for line in drawing['barLines'] if
            drawing['strike']+40<line['x']<canvas_width-24)
        pixels=self.page.locator('#fishingRhythmCanvas').evaluate('''(canvas,info)=>{
          const g=canvas.getContext('2d'),samples=[];
          for(let dx=-1;dx<=1;dx++)samples.push(Array.from(g.getImageData(
            Math.floor(info.x)+dx,Math.round(info.y),1,1).data));
          return {bar:samples,gold:Array.from(g.getImageData(
            Math.round(info.strike),Math.round(info.y-54),1,1).data)};
        }''',{'x':visible['x'],'y':drawing['lineY']+19,'strike':drawing['strike']})
        self.assertGreater(max(pixel[2] for pixel in pixels['bar']),195,
                           'The blue divider must be clearly visible in actual canvas pixels')
        self.assertGreater(pixels['gold'][0],200);self.assertGreater(pixels['gold'][1],150)
        self.assertLess(pixels['gold'][2],130,'The tap line must remain gold and distinct')

    def test_visible_dividers_use_each_meters_measure_boundaries(self):
        for meter in ['4/4','6/8','2/2']:
            fish=self.choose('steady','common',meter)
            state=self.begin_fish(fish,meter)
            self.advance_to(state['challenge']['musicStart']-.5)
            self.assert_bars(meter)
            self.cancel()

    def test_measure_dividers_follow_accelerando_and_ritardando(self):
        for change in ['accelerando','ritardando']:
            fish=self.choose(change,'epic')
            self.begin_fish(fish)
            state=self.state()
            self.play_through_beat(state['challenge']['tempo']['startBeat']+1)
            self.assertTrue(self.state()['challenge']['tempo']['active'])
            self.assert_bars(fish['meters'][0])
            self.cancel()

    def test_phone_dividers_keep_the_strike_and_rhythm_button_readable_phone(self):
        state=self.begin_fish(self.choose('steady','common','4/4'),'4/4')
        self.advance_to(state['challenge']['musicStart']-.5)
        for size in [{'width':390,'height':844},{'width':844,'height':390}]:
            self.page.set_viewport_size(size);self.page.clock.run_for(32)
            self.assert_bars('4/4')
            tap=self.page.locator('#fishingTap').bounding_box()
            self.assertGreaterEqual(tap['height'],64)
            self.assertLessEqual(tap['y']+tap['height'],size['height']+1)
        self.page.screenshot(path='/tmp/coda-fishing36-bars-landscape.png')

    def test_active_hold_trails_clear_measure_labels_and_gold_strike_phone(self):
        state=self.begin_fish(self.choose('steady','common','6/8'),'6/8')
        note=next(note for note in state['challenge']['notes'] if note['requiresHold'])
        self.advance_to(note['time']);self.page.keyboard.down('Space')
        self.advance_to(note['time']+note['durationSeconds']*.5)
        for size in [{'width':390,'height':844},{'width':844,'height':390}]:
            self.page.set_viewport_size(size);self.page.clock.run_for(32)
            state=self.state();drawing=state['beaming']
            trail=next(trail for trail in drawing['holdTrails'] if trail['id']==note['id'])
            self.assertTrue(trail['active']);self.assertGreater(trail['progress'],.4)
            self.assertLess(trail['progress'],.85)
            self.assertAlmostEqual(trail['end']-trail['x'],note['duration']*drawing['spacing'],places=7)
            self.assertLess(trail['x'],drawing['strike']);self.assertGreater(trail['end'],drawing['strike']+15)
            pixels=self.page.locator('#fishingRhythmCanvas').evaluate('''(canvas,info)=>{
              const g=canvas.getContext('2d'),x=Math.round((info.strike+info.end)/2),y=info.y+13;
              return {tail:Array.from(g.getImageData(x,y,1,1).data),
                gold:Array.from(g.getImageData(Math.round(info.strike),y,1,1).data)};
            }''',{'strike':drawing['strike'],'end':trail['end'],'y':drawing['lineY']})
            self.assertEqual(pixels['tail'][:3],[166,247,204],
                             'The unfinished part of a held note must remain visibly green')
            self.assertEqual(pixels['gold'][:3],[231,189,82],
                             'The hold trail must not paint over the gold strike line')
            labels=self.page.evaluate('time=>measureLabels.filter(item=>Math.abs(item.clock-time)<1e-8)',state['clock'])
            if size['height']>size['width']:
                self.assertTrue(labels,'Portrait should still identify the next complete measure')
                for label in labels:
                    self.assertGreater(label['top'],drawing['lineY']+24,
                                       'Measure text needs clear vertical space beneath hold tails and bars')
                    self.assertGreater(label['left'],drawing['strike']+5,
                                       'Measure text must not cover the gold strike line')
            else:
                self.assertEqual(labels,[],'Short landscape omits measure labels to preserve tap space')
            self.page.screenshot(path='/tmp/coda-fishing36-hold-'+str(size['width'])+'.png')
        self.page.keyboard.up('Space')


del _base

if __name__=='__main__':unittest.main(verbosity=2)
