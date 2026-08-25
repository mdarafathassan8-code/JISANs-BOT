self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={title:'JISANs BOT',body:'নতুন request এসেছে।',url:'/admin.html'};
  try{if(event.data)data={...data,...event.data.json()};}catch(_){try{data.body=event.data.text()}catch(__){}}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/favicon.ico',badge:'/favicon.ico',tag:'jisans-admin-request',renotify:true,vibrate:[200,100,200],data:{url:data.url||'/admin.html'}}));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||'/admin.html';
  event.waitUntil((async()=>{
    const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){if('focus'in client){await client.focus();if('navigate'in client)await client.navigate(url);return;}}
    if(self.clients.openWindow)await self.clients.openWindow(url);
  })());
});
