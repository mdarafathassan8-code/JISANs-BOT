const {db,init}=require('./_db');

module.exports=async(req,res)=>{
  await init();
  const paymentId=String(req.query.payment||'');
  const traderId=String(req.query.id||'');
  if(paymentId){
    const q=await db.execute({sql:"SELECT * FROM payments WHERE id=? AND status='approved'",args:[paymentId]});
    const r=q.rows[0];
    if(!r||Number(r.expires_at)>Date.now())return res.status(403).send('Download is not available yet.');
  }else{
    const q=await db.execute({sql:"SELECT * FROM requests WHERE id=? AND status='approved'",args:[traderId]});
    const r=q.rows[0];
    if(!r||Number(r.expires_at)>Date.now())return res.status(403).send('Download is not available yet.');
  }
  if(!process.env.BOT_FILE_URL)return res.status(503).send('Admin has not configured the bot file yet.');
  res.redirect(process.env.BOT_FILE_URL);
};
