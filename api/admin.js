const {db,init}=require('./_db');

const auth=(req,res)=>{
  if(req.headers.authorization!==`Bearer ${process.env.ADMIN_KEY}`){
    res.status(401).json({error:'Admin Key ভুল হয়েছে'}); return false;
  }
  return true;
};

module.exports=async(req,res)=>{
  if(!auth(req,res)) return;
  try{
    await init();
    if(req.method==='GET'){
      const [rq,pq]=await Promise.all([
        db.execute('SELECT * FROM requests ORDER BY created_at DESC'),
        db.execute('SELECT id,amount,status,reason,screenshot,payment_reference,created_at,expires_at FROM payments ORDER BY created_at DESC')
      ]);
      return res.status(200).json({ok:true,requests:rq.rows,payments:pq.rows});
    }
    if(req.method!=='POST') return res.status(405).json({error:'method not allowed'});
    const {id,action}=req.body||{};

    if(action==='payment_accept'||action==='payment_reject'){
      if(!id) return res.status(400).json({error:'invalid payment id'});
      if(action==='payment_accept'){
        const exp=Date.now()+72*60*60*1000;
        await db.execute({sql:`UPDATE payments SET status='approved',reason=NULL,expires_at=? WHERE id=?`,args:[exp,String(id)]});
        return res.json({ok:true,action:'accepted',expiresAt:new Date(exp).toISOString()});
      }
      const reason='পেমেন্ট যাচাই করা যায়নি। অনুগ্রহ করে সঠিক payment screenshot submit করুন।';
      await db.execute({sql:`UPDATE payments SET status='rejected',reason=?,expires_at=NULL WHERE id=?`,args:[reason,String(id)]});
      return res.json({ok:true,action:'rejected',reason});
    }

    if(!/^\d{8}$/.test(String(id||''))) return res.status(400).json({error:'invalid Trader ID'});
    if(!['accept','reject_link','reject_deposit'].includes(action)) return res.status(400).json({error:'invalid action'});
    if(action==='accept'){
      const exp=Date.now()+72*60*60*1000;
      await db.execute({sql:`UPDATE requests SET status='approved',reason=NULL,expires_at=? WHERE id=?`,args:[exp,String(id)]});
      return res.json({ok:true,action:'accepted',expiresAt:new Date(exp).toISOString()});
    }
    const reason=action==='reject_link'?'এই Trader ID-টি JISANs Trader-এর লিংকে নয়।':'আপনার একাউন্টে ডিপোজিট করা হয়নি';
    await db.execute({sql:`UPDATE requests SET status='rejected',reason=?,expires_at=NULL WHERE id=?`,args:[reason,String(id)]});
    return res.json({ok:true,action:'rejected',reason});
  }catch(e){
    console.error('ADMIN_API_ERROR',e);
    return res.status(500).json({error:`Database error: ${e.message||'unknown error'}`});
  }
};