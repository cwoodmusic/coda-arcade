"""The canonical join and final corner caps match their reviewed art sources."""
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
        meta=json.loads((fixture.ROOT/'scripts/boutique-join-regions.json').read_text())
        cap=json.loads((fixture.ROOT/'scripts/boutique-corner-cap-regions.json').read_text())
        self.load()
        result=self.page.evaluate('''async({meta,cap})=>{
          const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
          const [native,reviewed,corner]=await Promise.all([load(meta.output),load(meta.source),load(cap.source)]),[w,h]=meta.worldSize;
          const canvas=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
          const a=canvas(),b=canvas(),c=canvas(),d=canvas();a.getContext('2d').drawImage(native,0,0);b.getContext('2d').drawImage(reviewed,0,0);__paletteConsole.renderBase(c.getContext('2d'));
          const dc=d.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(corner,...cap.sourcePlacement);
          const aa=a.getContext('2d').getImageData(0,0,w,h).data,bb=b.getContext('2d').getImageData(0,0,w,h).data,cc=c.getContext('2d').getImageData(0,0,w,h).data,dd=dc.getImageData(0,0,w,h).data;
          const inPolygon=(poly,x,y)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
            const [ax,ay]=poly[i],[bx,by]=poly[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)hit=!hit;
          }return hit;};
          let joinCount=0,capCount=0,preservedJoinCount=0,nativeMismatch=0,baseMismatch=0;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const inJoin=meta.polygons.some(p=>inPolygon(p,x+.5,y+.5)),inCap=cap.polygons.some(p=>inPolygon(p,x+.5,y+.5));
            if(inJoin)joinCount++;if(inCap)capCount++;if(inJoin&&!inCap)preservedJoinCount++;
            if(!inJoin&&!inCap)continue;
            const at=(y*w+x)*4,expected=inCap?dd:bb;
            if([0,1,2,3].some(k=>aa[at+k]!==expected[at+k]))nativeMismatch++;
            if([0,1,2,3].some(k=>cc[at+k]!==expected[at+k]))baseMismatch++;
          }
          return {joinCount,capCount,preservedJoinCount,nativeMismatch,baseMismatch,source:CodaDeveloperConsole.getProjectSource(),local:localStorage.getItem('codaWorldProjectV1')};
        }''',{'meta':meta,'cap':cap})
        self.assertEqual(result,{'joinCount':26000,'capCount':5141,'preservedJoinCount':22718,'nativeMismatch':0,'baseMismatch':0,'source':'published','local':None})
        self.assertEqual(self.project(),self.current,'Loading canonical artwork must not rewrite the project or collision entries')


if __name__=='__main__':
    unittest.main(verbosity=2)
