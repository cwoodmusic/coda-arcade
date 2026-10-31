/* Exact old-pixel compatibility rules; never infer custom paint from its hue. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.join(root,'assets/environment/floor-palette-compat.json');
const journals=[],args=process.argv.slice(2);let check=false;
for(let i=0;i<args.length;i++){
 if(args[i]==='--check'){check=true;continue;}
 const flag=args[i],value=args[++i];
 if(!value||!['--legacy','--legacy-ref'].includes(flag))throw Error('Use --legacy FILE, --legacy-ref COMMIT or --check');
 if(flag==='--legacy-ref'&&!/^[0-9a-f]{7,40}$/.test(value))throw Error('A legacy ref must be a commit SHA');
 let text;
 if(flag==='--legacy')text=fs.readFileSync(value,'utf8');
 else try{text=execFileSync('git',['show',value+':published-world-project.json'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});}
 catch{throw Error('Could not read legacy commit '+value+'; Git subprocess access and the commit must be available');}
 const data=JSON.parse(text);
 journals.push(data.artwork?.['background.world']||data);
}
const target=JSON.parse(fs.readFileSync(path.join(root,'published-world-project.json'),'utf8')).artwork?.['background.world'];
const width=1672,height=941,known=new Map(),targetPixels=new Map();
function remember(key,index,color){
 const id=key+'/'+index;let values=known.get(id);if(!values)known.set(id,values=new Set());values.add(color);
}
function visit(texture,callback){
 if(!texture)return;
 if(texture.width!==width||texture.height!==height)throw Error('Unexpected floor journal dimensions');
 for(const [key,runs]of Object.entries(texture.tiles))for(const [start,length,color]of runs)
  for(let index=start;index<start+length;index++)callback(key,index,color);
}
// Existing rules retain their old-color provenance, so normal rebuilds need
// neither an attachment nor a full Git history. --legacy adds another export.
if(fs.existsSync(output)){
 const previous=JSON.parse(fs.readFileSync(output,'utf8'));
 for(const [key,rules]of Object.entries(previous.tiles))for(const [start,length,color,target]of rules)
  for(let index=start;index<start+length;index++){
   remember(key,index,color);
   // A project may have been saved after an intermediate palette update.
   if(target!==null)remember(key,index,target);
  }
}
for(const journal of journals)visit(journal,remember);
if(!known.size)throw Error('Seed at least one known legacy floor journal');
visit(target,(key,index,color)=>targetPixels.set(key+'/'+index,color));
const groups=new Map();
for(const [id,colors]of known){
 const split=id.lastIndexOf('/'),tile=id.slice(0,split),index=Number(id.slice(split+1)),next=targetPixels.get(id)??null;
 for(const color of colors){
  if(color===next)continue;
  const key=JSON.stringify([tile,color,next]);let indices=groups.get(key);if(!indices)groups.set(key,indices=[]);indices.push(index);
 }
}
const tiles={};
for(const [key,indices]of [...groups].sort(([a],[b])=>a.localeCompare(b))){
 const [tile,color,next]=JSON.parse(key),rules=tiles[tile]||(tiles[tile]=[]);indices.sort((a,b)=>a-b);
 for(const index of indices){const last=rules.at(-1);
  if(last&&last[0]+last[1]===index&&last[2]===color&&last[3]===next)last[1]++;
  else rules.push([index,1,color,next]);
 }
}
const contents=JSON.stringify({version:1,width,height,tiles})+'\n';
if(check){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==contents)throw Error('Floor palette compatibility rules are stale');}
else fs.writeFileSync(output,contents);
console.log(JSON.stringify({mode:check?'check':'write',tiles:Object.keys(tiles).length,rules:Object.values(tiles).reduce((sum,rules)=>sum+rules.length,0),bytes:Buffer.byteLength(contents)}));
