const $=s=>document.querySelector(s);
let script,widget,ready,loadedKey;
function loadApi(){return script??=new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src='https://widget.mixcloud.com/media/js/widgetApi.js';tag.onload=resolve;tag.onerror=()=>reject(Error('Mixcloud could not be reached.'));document.head.append(tag);});}
export function createMixcloud({onPlay,onPause,onProgress,onError}){
 function show(episode){
  $('#mixcloud-player').hidden=false;$('#mixcloud-source').href=episode.source;
  if(loadedKey===episode.mixcloudKey)return ready;
  const iframe=$('#mixcloud-frame');iframe.loading='eager';
  const frameLoaded=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Mixcloud player took too long to load.')),25000);iframe.onload=()=>{clearTimeout(timeout);resolve();};});
  // The current official embed redirects to this host. Wait for the frame to
  // load before its API handshake, otherwise messages target about:blank.
  iframe.src=`https://player-widget.mixcloud.com/?hide_cover=1&mini=1&light=0&feed=${encodeURIComponent(episode.mixcloudKey)}`;
  loadedKey=episode.mixcloudKey;widget=null;
  const expected=loadedKey;
  ready=Promise.all([loadApi(),frameLoaded]).then(()=>{if(expected!==loadedKey)throw Error('Show changed.');widget=window.Mixcloud.PlayerWidget(iframe);return widget.ready;}).then(()=>{if(expected!==loadedKey)throw Error('Show changed.');const active=fn=>(...args)=>{if(expected===loadedKey)fn(...args);};widget.events.play.on(active(onPlay));widget.events.pause.on(active(onPause));widget.events.ended.on(active(onPause));widget.events.progress.on(active(onProgress));widget.events.error.on(active(onError));return widget;});
  // Showing a player does not initiate playback. Allow the official iframe to
  // work independently if its API is blocked by a browser or network policy.
  ready.catch(()=>{if(expected===loadedKey)onError();});return ready;
 }
 return {show,async play(episode){const instance=await show(episode);await instance.play();},pause(){widget?.pause().catch(()=>{});},clear(){widget?.pause().catch(()=>{});loadedKey=null;widget=null;$('#mixcloud-frame').removeAttribute('src');$('#mixcloud-player').hidden=true;},async seek(seconds){return widget?widget.seek(seconds):false;}};
}
