"""Reviewed architectural passes retain pixel-exact ownership and save data."""
import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('canonical_join_fixture',Path(__file__).with_name('floor-palette-compat-browser.py'))
fixture=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


class BoutiqueJoinTests(unittest.TestCase):
    setUpClass=classmethod(fixture.FloorPaletteCompatibilityTests.setUpClass.__func__)
    tearDownClass=classmethod(fixture.FloorPaletteCompatibilityTests.tearDownClass.__func__)
    setUp=fixture.FloorPaletteCompatibilityTests.setUp
    tearDown=fixture.FloorPaletteCompatibilityTests.tearDown
    load=fixture.FloorPaletteCompatibilityTests.load
    project=fixture.FloorPaletteCompatibilityTests.project

    def test_native_join_and_runtime_base_match_reviewed_source_without_new_local_saves(self):
        layers=[json.loads((fixture.ROOT/'scripts'/name).read_text()) for name in [
            'boutique-join-regions.json','boutique-corner-cap-regions.json',
            'hall-roof-cap-regions.json','lounge-club-roof-regions.json',
            'dance-northwest-south-wall-regions.json','arcade-north-straight-cap-regions.json']]
        self.load()
        result=self.page.evaluate('''async layers=>{
          const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
          const [native,...sources]=await Promise.all([load(layers[0].output),...layers.map(meta=>load(meta.source))]),[w,h]=layers[0].worldSize;
          const canvas=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
          const a=canvas(),c=canvas();a.getContext('2d').drawImage(native,0,0);__paletteConsole.renderBase(c.getContext('2d'));
          const aa=a.getContext('2d').getImageData(0,0,w,h).data,cc=c.getContext('2d').getImageData(0,0,w,h).data;
          const expectedPixels=sources.map((source,index)=>{
            const c=canvas(),g=c.getContext('2d'),meta=layers[index],placement=meta.sourcePlacement||[0,0,w,h];g.imageSmoothingEnabled=false;
            if(meta.sourceRect)g.drawImage(source,...meta.sourceRect,...placement);else g.drawImage(source,...placement);
            for(const region of meta.sourceCopies||[])g.drawImage(c,...region);
            return g.getImageData(0,0,w,h).data;
          });
          const inPolygon=(poly,x,y)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
            const [ax,ay]=poly[i],[bx,by]=poly[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
          }return hit;};
          const owns=(meta,x,y)=>meta.polygons.some(p=>inPolygon(p,x+.5,y+.5))&&!(meta.protectedPolygons||[]).some(p=>inPolygon(p,x+.5,y+.5))&&!(meta.protectedBounds||[]).some(([left,top,width,height])=>x>=left&&x<left+width&&y>=top&&y<top+height);
          const maskCounts=layers.map(()=>0),ownerCounts=layers.map(()=>0);let nativeMismatch=0,baseMismatch=0;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            let owner=-1;for(let index=0;index<layers.length;index++)if(owns(layers[index],x,y)){maskCounts[index]++;owner=index;}
            if(owner<0)continue;ownerCounts[owner]++;
            const at=(y*w+x)*4,expected=expectedPixels[owner];
            if([0,1,2,3].some(k=>aa[at+k]!==expected[at+k]))nativeMismatch++;
            if([0,1,2,3].some(k=>cc[at+k]!==expected[at+k]))baseMismatch++;
          }
          return {maskCounts,ownerCounts,nativeMismatch,baseMismatch,source:CodaDeveloperConsole.getProjectSource(),local:localStorage.getItem('codaWorldProjectV1')};
        }''',layers)
        self.assertEqual(result['maskCounts'][:2],[26000,5141])
        self.assertTrue(all(count>0 for count in result['ownerCounts']),result)
        self.assertEqual(result['nativeMismatch'],0,result)
        self.assertEqual(result['baseMismatch'],0,result)
        self.assertEqual(result['source'],'published')
        self.assertIsNone(result['local'])
        self.assertEqual(self.project(),self.current,'Loading canonical artwork must not rewrite the project or collision entries')


if __name__=='__main__':
    unittest.main(verbosity=2)
