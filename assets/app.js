const API = '/api';

function toast(msg, type = 'info') {
  let t = document.querySelector('.toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

async function api(path, options = {}) {
  const opts = { credentials: 'include', ...options };
  opts.headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const res = await fetch(API + path, opts);
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

async function getUser() {
  try { return (await api('/auth')).user; } catch (_) { return null; }
}

function setBusy(button, busy, text) {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    if (text) button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

function requirePage() {
  getUser().then(u => {
    if (!u) { location.href = 'login.html'; return; }
    document.querySelectorAll('[data-user-name]').forEach(x => x.textContent = u.first_name);
    document.querySelectorAll('[data-user-full-name]').forEach(x => x.textContent = `${u.first_name} ${u.last_name}`);
    document.querySelectorAll('[data-role]').forEach(x => x.textContent = u.role);
    document.querySelectorAll('[data-member-only]').forEach(x => x.style.display = u.role === 'member' ? '' : 'none');
  });
}

function wirePasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? 'Show' : 'Hide';
    };
  });
}

function passwordStrength(password) {
  if (!password) return { label: '', score: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return { score, label: score <= 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong' };
}

function wirePasswordStrength() {
  const input = document.querySelector('#regPassword');
  const bar = document.querySelector('#passwordStrength');
  const text = document.querySelector('#passwordStrengthText');
  if (!input || !bar || !text) return;
  input.addEventListener('input', () => {
    const s = passwordStrength(input.value);
    bar.style.width = `${s.score * 20}%`;
    text.textContent = s.label ? `Password strength: ${s.label}` : '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname.split('/').pop() || 'index.html';
  const protectedPages = ['dashboard.html','profile.html','checkin.html','community.html','mentor.html','emergency.html','payment.html','settings.html'];
  if (protectedPages.includes(path)) requirePage();
  wirePasswordToggles();
  wirePasswordStrength();

  const login = document.querySelector('#loginForm');
  if (login) login.onsubmit = async e => {
    e.preventDefault();
    const msg = document.querySelector('#msg');
    msg.textContent = 'Signing in...';
    try {
      const d = await api('/auth', { method:'POST', body:JSON.stringify({ action:'login', email:document.querySelector('#email').value, password:document.querySelector('#password').value }) });
      location.href = ['staff','admin'].includes(d.user.role) ? 'staff.html' : 'dashboard.html';
    } catch (err) { msg.textContent = err.message; if (err.message.includes('verify your email')) { msg.innerHTML = `${escapeHtml(err.message)} <button type="button" class="link-button" id="inlineResend">Resend verification</button>`; const b=document.querySelector('#inlineResend'); if(b)b.onclick=()=>resendVerificationEmail(document.querySelector('#email').value.trim().toLowerCase(),msg,b); } }
  };

  const reg = document.querySelector('#registerForm');
  if (reg) {
    const tabs = document.querySelectorAll('[data-role-tab]');
    const staffPanel = document.querySelector('#staffPanel');
    let selectedRole = 'member';
    const setRole = role => {
      selectedRole = role;
      tabs.forEach(t => t.classList.toggle('active', t.dataset.roleTab === role));
      if (staffPanel) staffPanel.hidden = role !== 'staff';
    };
    tabs.forEach(t => t.onclick = () => setRole(t.dataset.roleTab));
    setRole('member');
    reg.onsubmit = async e => {
      e.preventDefault();
      const msg = document.querySelector('#msg');
      const fullName = document.querySelector('#fullName').value.trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstName = parts.shift() || '';
      const lastName = parts.join(' ') || firstName;
      const emailValue = document.querySelector('#regEmail').value.trim().toLowerCase();
      const confirmEmail = document.querySelector('#confirmEmail').value.trim().toLowerCase();
      const passwordValue = document.querySelector('#regPassword').value;
      const confirmPassword = document.querySelector('#confirmPassword').value;
      if (!firstName || !fullName.includes(' ')) return msg.textContent = 'Please enter your full name (first and last name).';
      if (emailValue !== confirmEmail) return msg.textContent = 'Email addresses do not match.';
      if (passwordValue !== confirmPassword) return msg.textContent = 'Passwords do not match.';
      if (passwordValue.length < 8) return msg.textContent = 'Please use a password of at least 8 characters.';
      if (!document.querySelector('#terms').checked) return msg.textContent = 'Please agree to the Terms of Service and Privacy Policy.';
      if (selectedRole === 'staff' && !document.querySelector('#staffCode').value.trim()) return msg.textContent = 'Please enter the staff registration code.';
      msg.textContent = 'Creating account and sending verification email...';
      const button = reg.querySelector('button[type=submit]'); setBusy(button,true,'Creating account...');
      try {
        const d = await api('/auth',{method:'POST',body:JSON.stringify({action:'register',firstName,lastName,email:emailValue,phone:document.querySelector('#phone').value, password:passwordValue,role:selectedRole,staffCode:document.querySelector('#staffCode').value.trim()})});
        msg.textContent = d.message || 'Account created. Check your email to verify it.'; reg.reset(); setRole('member');
      } catch(err){msg.textContent=err.message;} finally{setBusy(button,false);}
    };
  }

  const resendVerification = document.querySelector('#resendVerification');
  async function resendVerificationEmail(emailValue, msg, button) {
    if (!emailValue) { msg.textContent = 'Enter your email address first.'; return; }
    setBusy(button, true, 'Sending...');
    try {
      const d = await api('/auth', {method:'POST', body:JSON.stringify({action:'resend-verification',email:emailValue})});
      msg.textContent = d.message;
      let seconds = 60;
      if (button) {
        button.disabled = true;
        const timer = setInterval(() => { seconds--; button.textContent = seconds > 0 ? `Resend again in ${seconds}s` : 'Resend verification email'; if (seconds <= 0) { clearInterval(timer); button.disabled = false; } }, 1000);
      }
    } catch(e) { msg.textContent = e.message; setBusy(button, false); }
  }
  if (resendVerification) resendVerification.onclick = () => resendVerificationEmail(document.querySelector('#email').value.trim().toLowerCase(), document.querySelector('#msg'), resendVerification);


  const logout = document.querySelector('#logoutBtn');
  if (logout) logout.onclick = async () => { try { await api('/auth',{method:'POST',body:JSON.stringify({action:'logout'})}); } finally { location.href='index.html'; } };

  if(path==='dashboard.html') loadDashboard();
  if(path==='profile.html') loadProfile();
  if(path==='checkin.html') loadCheckins();
  if(path==='community.html') loadCommunity();
  if(path==='mentor.html') loadMentor();
  if(path==='emergency.html') loadEmergency();
  if(path==='payment.html') loadPayments();
  if(path==='settings.html') loadSettings();
  if(path==='staff.html') getUser().then(u=>{if(!u||!['staff','admin'].includes(u.role)){location.href='login.html';return}loadStaff()});
  if(path==='verify.html') handleVerification();
  if(path==='forgot-password.html') wireForgotPassword();
  if(path==='reset-password.html') wireResetPassword();
});

async function loadDashboard() {
  try {
    const d = await api('/dashboard');
    const name = d.user.first_name;
    document.querySelectorAll('[data-user-name]').forEach(x => x.textContent = name);
    const h = document.querySelector('.welcome h1');
    if (h) h.textContent = `Welcome back, ${name} 👋`;
    const status = d.user.membership_status;
    const pill = document.querySelector('#membershipPill');
    const info = document.querySelector('#membershipInfo');
    if (pill) pill.textContent = status === 'active' ? `${d.user.membership_plan} / month — Active` : 'Membership inactive';
    if (info) info.textContent = status === 'active' ? `Active until ${fmtDate(d.user.membership_expires_at)}` : 'Choose a membership to activate access.';
    const checkins = document.querySelector('#checkinCount');
    const mentors = document.querySelector('#mentorCount');
    const payments = document.querySelector('#paymentCount');
    if (checkins) checkins.textContent = d.stats.checkins;
    if (mentors) mentors.textContent = d.stats.mentorRequests;
    if (payments) payments.textContent = d.stats.payments;
  } catch(e) { toast(e.message,'error'); }
}

async function loadProfile() {
  try {
    const d = await api('/profile'), u = d.user;
    firstName.value=u.first_name; lastName.value=u.last_name; profileEmail.value=u.email; phone.value=u.phone||'';
    const membership = document.querySelector('#profileMembership');
    if (membership) membership.textContent = u.membership_status === 'active' ? `${u.membership_plan} — Active until ${fmtDate(u.membership_expires_at)}` : 'Inactive';
  } catch(e) { toast(e.message,'error'); }
  const save = document.querySelector('#saveProfile');
  if(save) save.onclick=async()=>{setBusy(save,true,'Saving...');try{await api('/profile',{method:'PUT',body:JSON.stringify({firstName:firstName.value,lastName:lastName.value,phone:phone.value})});toast('Profile updated successfully.');loadDashboard?.()}catch(e){toast(e.message,'error')}finally{setBusy(save,false)}};
}

async function loadCheckins(){
  const out=document.querySelector('#recent');
  const refresh=async()=>{try{const d=await api('/checkins');out.innerHTML=d.checkins.length?d.checkins.map(x=>`<div class="post"><b>${escapeHtml(x.mood)}</b> — ${escapeHtml(x.note||'No note added')}<br><small>${fmtDate(x.created_at)}</small></div>`).join(''):'No check-ins yet.'}catch(e){toast(e.message,'error')}};
  refresh();
  const save=document.querySelector('#saveCheckin');
  if(save)save.onclick=async()=>{const mood=document.querySelector('input[name=mood]:checked');if(!mood)return toast('Please select how you are feeling.','error');setBusy(save,true,'Saving...');try{await api('/checkins',{method:'POST',body:JSON.stringify({mood:mood.value,note:document.querySelector('#note').value})});document.querySelector('#note').value='';toast('Daily check-in saved.');refresh()}catch(e){toast(e.message,'error')}finally{setBusy(save,false)}};
}

async function loadCommunity(){
  const out=document.querySelector('#posts');
  async function refresh(){try{const d=await api('/community');out.innerHTML=d.posts.length?d.posts.map(p=>`<article class="post"><b>${escapeHtml(p.first_name)} ${escapeHtml(p.last_name||'')}</b><small> • ${fmtDate(p.created_at)}</small><p>${escapeHtml(p.content)}</p></article>`).join(''):'No community posts yet.'}catch(e){toast(e.message,'error')}}
  refresh();
  const btn=document.querySelector('#sharePost');if(btn)btn.onclick=async()=>{const input=document.querySelector('#postText');const content=input.value.trim();if(!content)return toast('Write a message first.','error');setBusy(btn,true,'Sharing...');try{await api('/community',{method:'POST',body:JSON.stringify({content})});input.value='';toast('Post shared.');refresh()}catch(e){toast(e.message,'error')}finally{setBusy(btn,false)}};
}

async function loadMentor(){
  const out=document.querySelector('#mentorHistory');
  async function refresh(){try{const d=await api('/mentor');out.innerHTML=d.requests.length?d.requests.map(r=>`<div class="post"><b>${escapeHtml(r.status)}</b> — ${escapeHtml(r.message||'Support requested')}<br><small>${fmtDate(r.created_at)}</small></div>`).join(''):'No mentor requests yet.'}catch(e){toast(e.message,'error')}}
  refresh();
  const btn=document.querySelector('#requestMentor');if(btn)btn.onclick=async()=>{setBusy(btn,true,'Sending...');try{await api('/mentor',{method:'POST',body:JSON.stringify({message:document.querySelector('#mentorMessage').value})});document.querySelector('#mentorMessage').value='';toast('Mentor request sent.');refresh()}catch(e){toast(e.message,'error')}finally{setBusy(btn,false)}};
}

async function loadEmergency(){
  const btn=document.querySelector('#panic');
  if(btn)btn.onclick=async()=>{if(!confirm('Send an urgent support request to Sober Hub staff?'))return;setBusy(btn,true,'Sending...');try{await api('/emergency',{method:'POST',body:JSON.stringify({message:document.querySelector('#emergencyMessage')?.value||'Urgent support requested.'})});btn.textContent='SUPPORT REQUEST RECORDED';toast('Support request recorded. If there is immediate danger, contact local emergency services.')}catch(e){toast(e.message,'error');setBusy(btn,false)}};
}

async function loadPayments(){
  const out=document.querySelector('#payments');
  try{const d=await api('/payments');out.innerHTML=d.payments.length?d.payments.map(p=>`<div class="post"><b>${escapeHtml(p.plan)}</b> — ${escapeHtml(p.status)} — ${escapeHtml(p.provider)}<br><small>${fmtDate(p.created_at)} • ${escapeHtml(p.provider_reference||'')}</small></div>`).join(''):'No payments yet.'}catch(e){out.textContent=e.message}
  const params=new URLSearchParams(location.search);
  const msg=document.querySelector('#paymentMsg');
  if(params.get('cancelled')==='1') msg.textContent='Payment was cancelled. No membership was activated.';
  if(params.get('success')==='1') { msg.textContent='Payment completed. Confirming your membership...'; const sid=params.get('session_id'); if(sid){ try { const v=await api('/payments',{method:'POST',body:JSON.stringify({action:'verify-session',sessionId:sid})}); msg.textContent=v.message; } catch(e){ msg.textContent=e.message; } await loadPayments(); } }
  const btn=document.querySelector('#payBtn');
  if(btn)btn.onclick=async()=>{const selected=document.querySelector('input[name=plan]:checked');if(!selected)return toast('Choose a membership plan.','error');setBusy(btn,true,'Preparing checkout...');msg.textContent='Preparing secure checkout...';try{const d=await api('/payments',{method:'POST',body:JSON.stringify({plan:selected.value})});if(d.mode==='stripe'){location.href=d.url;return;}msg.textContent=`${d.message} Reference: ${d.reference}`;toast('Membership activated.');loadPayments();loadDashboard?.()}catch(e){msg.textContent=e.message;toast(e.message,'error')}finally{setBusy(btn,false)}};
}

async function loadSettings(){
  const form=document.querySelector('#changePasswordForm');
  if(form)form.onsubmit=async e=>{e.preventDefault();const msg=document.querySelector('#settingsMsg');const current=document.querySelector('#currentPassword').value;const next=document.querySelector('#newPassword').value;const confirmNew=document.querySelector('#confirmNewPassword').value;if(next.length<8)return msg.textContent='New password must be at least 8 characters.';if(next!==confirmNew)return msg.textContent='New passwords do not match.';msg.textContent='Updating password...';try{await api('/auth',{method:'POST',body:JSON.stringify({action:'change-password',currentPassword:current,newPassword:next})});form.reset();msg.textContent='Password changed successfully.';toast('Password updated.')}catch(e){msg.textContent=e.message}}
}

async function loadStaff(){
  try{
    const d=await api('/staff');
    memberCount.textContent=d.members.length;mentorCount.textContent=d.mentors.length;emergencyCount.textContent=d.emergencies.length;
    members.innerHTML=`<table class="table"><tr><th>Name</th><th>Email</th><th>Role</th><th>Membership</th></tr>${d.members.map(m=>`<tr><td>${escapeHtml(m.first_name)} ${escapeHtml(m.last_name)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.role)}</td><td><span class="badge">${escapeHtml(m.membership_status)}</span></td></tr>`).join('')}</table>`;
    requests.innerHTML=[...d.emergencies.map(x=>`<div class="post"><b>Emergency • ${escapeHtml(x.status)}</b><p>${escapeHtml(x.first_name)} ${escapeHtml(x.last_name)}: ${escapeHtml(x.message)}</p><small>${fmtDate(x.created_at)}</small><div class="request-actions"><button class="btn smallbtn" data-request="emergency" data-id="${x.id}" data-status="Resolved">Mark resolved</button></div></div>`),...d.mentors.map(x=>`<div class="post"><b>Mentor • ${escapeHtml(x.status)}</b><p>${escapeHtml(x.first_name)} ${escapeHtml(x.last_name)}: ${escapeHtml(x.message||'Support requested')}</p><small>${fmtDate(x.created_at)}</small><div class="request-actions"><button class="btn smallbtn" data-request="mentor" data-id="${x.id}" data-status="In Progress">In progress</button><button class="btn smallbtn outline" data-request="mentor" data-id="${x.id}" data-status="Resolved">Resolved</button></div></div>`)].join('')||'No support requests.';
    document.querySelectorAll('[data-request]').forEach(btn=>btn.onclick=async()=>{setBusy(btn,true,'Saving...');try{await api('/staff',{method:'PATCH',body:JSON.stringify({type:btn.dataset.request,id:Number(btn.dataset.id),status:btn.dataset.status})});toast('Request status updated.');loadStaff()}catch(e){toast(e.message,'error')}finally{setBusy(btn,false)}});
  }catch(e){toast(e.message,'error')}
}


async function handleVerification(){
  const title=document.querySelector('#verifyTitle'),msg=document.querySelector('#verifyMsg'),link=document.querySelector('#verifyLink'),panel=document.querySelector('#verifyResend');
  const token=new URLSearchParams(location.search).get('token');
  const showResend=()=>{if(panel)panel.style.display='block';};
  if(!token){title.textContent='Verification link missing';msg.textContent='Please use the verification link from your Sober Hub email.';showResend();return;}
  try{const d=await api(`/auth?action=verify&token=${encodeURIComponent(token)}`);title.textContent='Email verified!';msg.textContent=d.message;link.style.display='inline-block';}
  catch(e){title.textContent='Verification could not be completed';msg.textContent=e.message;link.style.display='inline-block';if(e.message.toLowerCase().includes('expired')||e.message.toLowerCase().includes('invalid'))showResend();}
  const form=document.querySelector('#resendVerifyForm');
  if(form)form.onsubmit=async e=>{e.preventDefault();await resendVerificationEmail(document.querySelector('#verifyEmail').value.trim().toLowerCase(),document.querySelector('#resendVerifyMsg'),document.querySelector('#resendVerifyBtn'));};
}
async function wireForgotPassword(){const form=document.querySelector('#forgotForm');if(!form)return;form.onsubmit=async e=>{e.preventDefault();const msg=document.querySelector('#forgotMsg');msg.textContent='Sending...';try{const d=await api('/auth',{method:'POST',body:JSON.stringify({action:'forgot-password',email:document.querySelector('#forgotEmail').value})});msg.textContent=d.message;}catch(err){msg.textContent=err.message;}}}
async function wireResetPassword(){const form=document.querySelector('#resetForm');if(!form)return;const token=new URLSearchParams(location.search).get('token');form.onsubmit=async e=>{e.preventDefault();const msg=document.querySelector('#resetMsg');const p=document.querySelector('#resetPassword').value,c=document.querySelector('#resetConfirm').value;if(!token)return msg.textContent='This reset link is missing.';if(p!==c)return msg.textContent='Passwords do not match.';if(p.length<8)return msg.textContent='Password must be at least 8 characters.';msg.textContent='Resetting password...';try{const d=await api('/auth',{method:'POST',body:JSON.stringify({action:'reset-password',token,newPassword:p})});msg.textContent=d.message;form.reset();setTimeout(()=>location.href='login.html',1200);}catch(err){msg.textContent=err.message;}}}
