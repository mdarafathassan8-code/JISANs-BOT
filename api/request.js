const {db,init}=require('./_db');
const {sendPush}=require('./push');

module.exports=async(req,res)=>{
  try{
    await init();
    if(req.method!=='POST')return res.status(405).json({error:'method'});
    let {id}=req.body||{};
    if(!/^\d{8}$/.test(id||''))return res.status(400).json({error:'invalid'});
    let q=await db.execute({sql:'SELECT * FROM requests WHERE id=?',args:[id]});
    let row=q.rows[0];
    if(row?.status==='approved'&&row.expires_at>Date.now())return res.json({approved:true,expiresAt:new Date(Number(row.expires_at)).toISOString()});
    if(row?.status==='rejected')return res.json({rejected:true,reason:row.reason});
    await db.execute({sql:`INSERT INTO requests(id,status,created_at) VALUES(?, 'pending', ?) ON CONFLICT(id) DO UPDATE SET status='pending',reason=NULL`,args:[id,Date.now()]});
    // This is the ONLY Trader ID event that triggers the admin phone notification.
    try{await sendPush('JISANs BOT — New Trader ID','একটি নতুন ৮ সংখ্যার Trader ID submit হয়েছে। Admin Panel খুলে review করুন।')}catch(e){console.error('REQUEST_PUSH_ERROR',e.message||e)}
    res.json({pending:true});
  }catch(e){
    console.error('REQUEST_API_ERROR',e);
    res.status(500).json({error:e.message||'request error'});
  }
};
