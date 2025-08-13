const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

const state = { products: [], cart: [], heroIndex: 0 };

async function loadProducts(){
  const res = await fetch('data/products.json');
  const data = await res.json();
  state.products = data;
}

function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }
function loadCart(){
  try { state.cart = JSON.parse(localStorage.getItem('cart')) || []; }
  catch { state.cart = []; }
  updateCartBadge();
}

function updateCartBadge(){
  const count = state.cart.reduce((a,i)=>a+i.qty,0);
  $('#cartCount').textContent = count;
}

function money(n){ return n.toLocaleString('es-AR', {style:'currency', currency:'ARS'}); }
function stars(n){ return '★'.repeat(Math.round(n)) + '☆'.repeat(5-Math.round(n)); }

function viewHome(){
  const hero = `
    <section class="hero" aria-label="Promociones">
      <img class="hero__slide active" src="assets/hero-1.webp" alt="Ofertas en tecnología" loading="lazy">
      <img class="hero__slide" src="assets/hero-2.webp" alt="Hogar y deco" loading="lazy">
      <div class="hero__dots" role="tablist">
        <button class="hero__dot active" aria-label="Ir a slide 1"></button>
        <button class="hero__dot" aria-label="Ir a slide 2"></button>
      </div>
    </section>`;
  const top = [...state.products].sort((a,b)=>b.rating - a.rating).slice(0,12).map(card).join('');
  return `${hero}
    <section>
      <h2>Descubrí</h2>
      <div class="grid">${top}</div>
    </section>`;
}

function viewList(items, title='Resultados'){
  const filters = `
    <div class="filters" role="region" aria-label="Filtros">
      <input type="number" id="minPrice" placeholder="Precio mín" min="0"/>
      <input type="number" id="maxPrice" placeholder="Precio máx" min="0"/>
      <select id="sortBy">
        <option value="">Ordenar</option>
        <option value="priceAsc">Precio: menor a mayor</option>
        <option value="priceDesc">Precio: mayor a menor</option>
        <option value="ratingDesc">Mejor calificados</option>
      </select>
      <button class="ml-btn" id="applyFilters">Aplicar</button>
    </div>`;
  const grid = `<div class="grid">${items.map(card).join('')}</div>`;
  return `<h2>${title}</h2>${filters}${grid}`;
}

function viewProduct(prod){
  const gal = `
    <div class="product__gallery">
      <img src="${prod.images[0]}" alt="${prod.title} - imagen principal"/>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${prod.images.slice(1).map(src=>`<img src="${src}" alt="${prod.title}" style="width:64px;height:64px;object-fit:cover;border:1px solid #eee;border-radius:6px;cursor:pointer" onclick="document.querySelector('.product__gallery img').src='${src}'">`).join('')}
      </div>
    </div>`;
  const info = `
    <div class="product__info">
      <div class="muted">${stars(prod.rating)} · ${prod.reviews} reseñas</div>
      <h1 class="product__title">${prod.title}</h1>
      <div class="price">${money(prod.price)}</div>
      <div class="installments">En 6x sin interés</div>
      <div class="ship">Llega gratis mañana</div>
      <div class="product__buy">
        <button class="ml-btn" onclick="addToCart('${prod.id}')">Agregar al carrito</button>
        <button class="ml-btn ml-btn--primary">Comprar ahora</button>
      </div>
      <p>${prod.description}</p>
    </div>`;
  return `<section class="product">${gal}${info}</section>`;
}

function card(p){
  return `
  <a class="card" href="#/product/${p.id}" aria-label="${p.title}">
    <div class="card__img"><img src="${p.images[0]}" alt="${p.title}" loading="lazy"></div>
    <div class="card__body">
      <div class="price">${money(p.price)}</div>
      <div class="card__title">${p.title}</div>
      <div class="muted">${stars(p.rating)} · ${p.reviews}</div>
      <div class="ship">Envío gratis</div>
    </div>
  </a>`;
}

function parseHash(){
  const h = location.hash || '#/';
  const [_, path, param] = h.split('/');
  return {path, param, query: new URLSearchParams(h.split('?')[1]||'')};
}

async function render(){
  const root = $('#app');
  const {path, param, query} = parseHash();

  if(!state.products.length) await loadProducts();

  if(!path){
    root.innerHTML = viewHome();
    setupHero();
    return;
  }

  if(path === 'search'){
    const q = (query.get('q')||'').toLowerCase();
    let items = state.products.filter(p => p.title.toLowerCase().includes(q) || p.category.includes(q));
    root.innerHTML = viewList(items, `Resultados para "${q}"`);
    setupFilters(items);
    return;
  }

  if(path === 'cat'){
    let items = state.products.filter(p=>p.categorySlug === param);
    const title = param[0].toUpperCase()+param.slice(1);
    root.innerHTML = viewList(items, title);
    setupFilters(items);
    return;
  }

  if(path === 'product'){
    const prod = state.products.find(p=>p.id === param);
    if(!prod){ root.innerHTML = '<p>Producto no encontrado.</p>'; return; }
    root.innerHTML = viewProduct(prod);
    return;
  }

  root.innerHTML = '<p>Página no encontrada.</p>';
}

function setupHero(){
  const slides = $$('.hero__slide');
  const dots = $$('.hero__dot');
  function go(i){
    state.heroIndex = i;
    slides.forEach((el,idx)=>el.classList.toggle('active', idx===i));
    dots.forEach((el,idx)=>el.classList.toggle('active', idx===i));
  }
  dots.forEach((d,i)=>d.addEventListener('click', ()=>go(i)));
  setInterval(()=>go((state.heroIndex+1)%slides.length), 5000);
}

function setupFilters(currentItems){
  $('#applyFilters').addEventListener('click', ()=>{
    const min = Number($('#minPrice').value || 0);
    const max = Number($('#maxPrice').value || Infinity);
    const sortBy = $('#sortBy').value;
    let items = currentItems.filter(p => p.price >= min && p.price <= max);
    if(sortBy === 'priceAsc') items.sort((a,b)=>a.price-b.price);
    if(sortBy === 'priceDesc') items.sort((a,b)=>b.price-a.price);
    if(sortBy === 'ratingDesc') items.sort((a,b)=>b.rating-a.rating);
    $('#app').innerHTML = viewList(items, $('h2')?.textContent || 'Resultados');
    setupFilters(items);
  });
}

$('#searchForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  location.hash = `#/search?q=${encodeURIComponent(q)}`;
});

function addToCart(id){
  const prod = state.products.find(p=>p.id===id);
  if(!prod) return;
  const idx = state.cart.findIndex(i=>i.id===id);
  if(idx>-1) state.cart[idx].qty += 1;
  else state.cart.push({id, title:prod.title, price:prod.price, image:prod.images[0], qty:1});
  updateCartBadge();
  saveCart();
  openCart();
}

function openCart(){
  $('#cartDrawer').classList.add('open');
  $('#overlay').classList.add('show');
  renderCart();
}
function closeCart(){
  $('#cartDrawer').classList.remove('open');
  $('#overlay').classList.remove('show');
}
$('#cartBtn').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', closeCart);

function renderCart(){
  const wrap = $('#cartItems');
  if(!state.cart.length){
    wrap.innerHTML = '<p class="muted">Tu carrito está vacío.</p>';
    $('#cartTotal').textContent = money(0);
    return;
  }
  wrap.innerHTML = state.cart.map(item=>`
    <div class="ml-cart__row">
      <img src="${item.image}" alt="${item.title}" width="56" height="56" style="object-fit:cover;border-radius:6px;border:1px solid #eee"/>
      <div>
        <div style="font-size:14px">${item.title}</div>
        <div class="muted">${money(item.price)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:6px">
          <button class="ml-btn" onclick="decQty('${item.id}')">-</button>
          <span>${item.qty}</span>
          <button class="ml-btn" onclick="incQty('${item.id}')">+</button>
          <button class="ml-btn" onclick="removeItem('${item.id}')">Eliminar</button>
        </div>
      </div>
      <div><strong>${money(item.price*item.qty)}</strong></div>
    </div>
  `).join('');
  const total = state.cart.reduce((a,i)=>a + i.price*i.qty, 0);
  $('#cartTotal').textContent = money(total);
}

function incQty(id){
  const it = state.cart.find(i=>i.id===id);
  if(!it) return;
  it.qty += 1; saveCart(); renderCart(); updateCartBadge();
}
function decQty(id){
  const it = state.cart.find(i=>i.id===id);
  if(!it) return;
  it.qty = Math.max(1, it.qty - 1); saveCart(); renderCart(); updateCartBadge();
}
function removeItem(id){
  state.cart = state.cart.filter(i=>i.id!==id); saveCart(); renderCart(); updateCartBadge();
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', async ()=>{
  loadCart();
  await render();
});
