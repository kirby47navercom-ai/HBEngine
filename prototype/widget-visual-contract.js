export const widgetLineHeight=1.3;
export const widgetSystemFont='"Segoe UI", "Malgun Gothic", system-ui, sans-serif';
export function widgetImageBox(image,width,height,fit='contain'){
 if(fit==='fill')return [0,0,width,height];
 const ratio=(fit==='cover'?Math.max:Math.min)(width/image.width,height/image.height),w=image.width*ratio,h=image.height*ratio;
 return [(width-w)/2,(height-h)/2,w,h];
}
export function widgetTextLines(text,width,wrap,measure){
 text=String(text??'');if(!wrap)return [text.replace(/\s+/gu,' ')];
 const lines=[];for(const paragraph of text.split('\n')){let line='';const words=paragraph.match(/[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]|[^\s\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]+|[ \t]+/gu)||[''];for(const word of words){if(line&&measure(line+word)>width&&!/^\s+$/u.test(word)){lines.push(line);line=word;}else line+=word;}lines.push(line);}return lines;
}
