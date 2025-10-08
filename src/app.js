const LS_KEY = 'reddit_lanes_v1'
const defaultLanes = ['learnprogramming','javascript']

const el = (sel) => document.querySelector(sel)
const lanesRoot = el('#lanes')
const addBtn = el('#add-lane')
const modal = el('#modal')
const input = el('#sub-input')
const cancelBtn = el('#cancel-add')
const confirmBtn = el('#confirm-add')

let lanes = loadLanes()

function loadLanes(){
  try{
    const raw = localStorage.getItem(LS_KEY)
    if(!raw) return defaultLanes.slice()
    const parsed = JSON.parse(raw)
    if(Array.isArray(parsed) && parsed.length) return parsed
    return defaultLanes.slice()
  }catch(e){
    return defaultLanes.slice()
  }
}

function saveLanes(){
  localStorage.setItem(LS_KEY, JSON.stringify(lanes))
}

function createLane(subreddit){
  const lane = document.createElement('section')
  lane.className = 'lane'
  lane.dataset.sub = subreddit

  lane.innerHTML = `
    <div class="lane-header">
      <h3>r/${subreddit}</h3>
      <div class="lane-actions">
        <button class="btn btn-secondary refresh">Refresh</button>
        <button class="btn btn-secondary remove">Delete</button>
      </div>
    </div>
    <div class="posts">
      <div class="loader">Loading...</div>
    </div>
  `

  const postsEl = lane.querySelector('.posts')
  lane.querySelector('.refresh').addEventListener('click', ()=>fetchAndRender(subreddit, postsEl))
  lane.querySelector('.remove').addEventListener('click', ()=>{
    lanes = lanes.filter(s=>s.toLowerCase()!==subreddit.toLowerCase())
    saveLanes()
    lane.remove()
  })

  fetchAndRender(subreddit, postsEl)
  return lane
}

async function fetchAndRender(subreddit, container){
  container.innerHTML = '<div class="loader">Loading...</div>'
  try{
    const resp = await fetch(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}.json`)
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if(!data || !data.data) throw new Error('Invalid response')

    const posts = (data.data.children || []).map(c=>c.data)
    if(posts.length===0){
      container.innerHTML = '<div class="empty">No posts found.</div>'
      return
    }

    container.innerHTML = ''
    posts.forEach(p=>{
      const a = document.createElement('a')
      a.href = `https://reddit.com${p.permalink}`
      a.target = '_blank'
      a.rel = 'noopener'
      a.className = 'post'
      a.innerHTML = `
        <div class="score">▲ ${p.score}</div>
        <div style="flex:1">
          <div class="post-title">${escapeHtml(p.title)}</div>
          <div class="post-meta">by ${escapeHtml(p.author)} • ${p.num_comments} comments</div>
        </div>
      `
      container.appendChild(a)
    })

  }catch(err){
    console.warn('fetch error', err)
    container.innerHTML = `<div class="error">Could not load r/${escapeHtml(subreddit)} — ${escapeHtml(err.message||'Error')}</div>`
  }
}

function escapeHtml(s){
  if(s==null) return ''
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
}

function renderAll(){
  lanesRoot.innerHTML = ''
  lanes.forEach(s=>{
    lanesRoot.appendChild(createLane(s))
  })
}

addBtn.addEventListener('click', ()=>{ modal.classList.remove('hidden'); input.value=''; input.focus() })
cancelBtn.addEventListener('click', ()=> modal.classList.add('hidden'))
confirmBtn.addEventListener('click', onConfirmAdd)
input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') onConfirmAdd() })

async function onConfirmAdd(){
  const v = input.value.trim().replace(/^r\//i,'').replace(/^\//,'')
  if(!v) return
  // check duplicate
  if(lanes.some(s=>s.toLowerCase()===v.toLowerCase())){
    alert('Subreddit already added')
    modal.classList.add('hidden')
    return
  }

  // quick existence check
  try{
    confirmBtn.disabled = true
    const resp = await fetch(`https://www.reddit.com/r/${encodeURIComponent(v)}/about.json`)
    if(!resp.ok) throw new Error('Not found')
    const data = await resp.json()
    if(data?.kind!=='t5') throw new Error('Not a subreddit')

    lanes.unshift(v)
    saveLanes()
    lanesRoot.prepend(createLane(v))
    modal.classList.add('hidden')
  }catch(err){
    alert(`Subreddit not found or inaccessible: ${v}`)
  }finally{ confirmBtn.disabled = false }
}

renderAll()
