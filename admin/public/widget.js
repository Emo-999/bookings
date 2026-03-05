/**
 * CloudCart Booking Widget
 * Drop-in JS for hotels and hair salons
 *
 * Usage in CloudCart HTML block:
 *   <div
 *     data-cloudcart-booking
 *     data-business-id="YOUR_BUSINESS_ID"
 *     data-supabase-url="https://xxx.supabase.co"
 *     data-supabase-key="YOUR_ANON_KEY"
 *   ></div>
 *   <script src="https://your-cdn.com/booking-widget.js"></script>
 */
(function () {
  'use strict';

  // ─── Supabase REST client (no SDK dependency) ────────────────────────────────
  function createClient(url, key) {
    const headers = {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    };

    async function from(table) {
      return {
        select: async (cols = '*', params = {}) => {
          const qs = new URLSearchParams({ select: cols, ...params });
          const res = await fetch(`${url}/rest/v1/${table}?${qs}`, { headers });
          if (!res.ok) throw await res.json();
          return res.json();
        },
        insert: async (data) => {
          const res = await fetch(`${url}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...headers, Prefer: 'return=representation' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw await res.json();
          return res.json();
        },
      };
    }

    async function rpc(fn, params = {}) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    }

    return { from, rpc };
  }

  // ─── CSS ─────────────────────────────────────────────────────────────────────
  const CSS = `
    .bw-widget { font-family: inherit; max-width: 540px; margin: 0 auto; }
    .bw-card   { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
                 padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .bw-title  { font-size: 1.25rem; font-weight: 700; margin: 0 0 20px; color: #111; }
    .bw-steps  { display: flex; gap: 6px; margin-bottom: 24px; }
    .bw-step   { flex: 1; height: 4px; border-radius: 2px; background: #e5e7eb; transition: background .2s; }
    .bw-step.active { background: #2563eb; }
    .bw-step.done   { background: #16a34a; }
    .bw-label  { display: block; font-size: .8rem; font-weight: 600; color: #374151;
                 margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
    .bw-input  { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db;
                 border-radius: 8px; padding: 10px 12px; font-size: .95rem;
                 outline: none; transition: border-color .2s; }
    .bw-input:focus { border-color: #2563eb; }
    .bw-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .bw-col    { margin-bottom: 14px; }
    .bw-grid   { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                 gap: 10px; margin-bottom: 14px; }
    .bw-card-opt { border: 2px solid #e5e7eb; border-radius: 10px; padding: 14px 12px;
                   cursor: pointer; transition: all .15s; text-align: center; }
    .bw-card-opt:hover   { border-color: #93c5fd; }
    .bw-card-opt.selected { border-color: #2563eb; background: #eff6ff; }
    .bw-card-opt .opt-name  { font-weight: 600; font-size: .9rem; color: #111; }
    .bw-card-opt .opt-sub   { font-size: .78rem; color: #6b7280; margin-top: 3px; }
    .bw-card-opt .opt-price { font-size: .85rem; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .bw-slots  { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .bw-slot   { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 14px;
                 cursor: pointer; font-size: .88rem; transition: all .15s; }
    .bw-slot:hover    { border-color: #2563eb; color: #2563eb; }
    .bw-slot.selected { background: #2563eb; color: #fff; border-color: #2563eb; }
    .bw-btn    { display: inline-flex; align-items: center; justify-content: center;
                 padding: 11px 24px; border-radius: 8px; font-size: .95rem;
                 font-weight: 600; cursor: pointer; border: none; transition: all .15s; }
    .bw-btn-primary { background: #2563eb; color: #fff; }
    .bw-btn-primary:hover { background: #1d4ed8; }
    .bw-btn-secondary { background: #f3f4f6; color: #374151; }
    .bw-btn-secondary:hover { background: #e5e7eb; }
    .bw-btn:disabled { opacity: .5; cursor: not-allowed; }
    .bw-actions { display: flex; justify-content: space-between; margin-top: 20px; gap: 10px; }
    .bw-error   { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
                  border-radius: 8px; padding: 10px 14px; font-size: .88rem; margin-bottom: 14px; }
    .bw-success { text-align: center; padding: 24px 0; }
    .bw-success-icon { font-size: 3rem; margin-bottom: 12px; }
    .bw-success h3 { font-size: 1.1rem; font-weight: 700; color: #15803d; margin: 0 0 8px; }
    .bw-success p  { color: #374151; font-size: .9rem; margin: 0; }
    .bw-calendar   { user-select: none; margin-bottom: 14px; }
    .bw-cal-header { display: flex; justify-content: space-between; align-items: center;
                     margin-bottom: 10px; }
    .bw-cal-nav    { background: none; border: 1px solid #e5e7eb; border-radius: 6px;
                     cursor: pointer; width: 30px; height: 30px; font-size: 1rem;
                     display: flex; align-items: center; justify-content: center; }
    .bw-cal-nav:hover { background: #f3f4f6; }
    .bw-cal-month  { font-weight: 600; font-size: .95rem; color: #111; }
    .bw-cal-grid   { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
    .bw-cal-day-name { text-align: center; font-size: .75rem; color: #9ca3af;
                       font-weight: 600; padding: 4px 0; }
    .bw-cal-day    { text-align: center; padding: 7px 2px; border-radius: 6px; font-size: .88rem;
                     cursor: pointer; transition: all .15s; }
    .bw-cal-day:hover:not(.disabled):not(.empty) { background: #eff6ff; color: #2563eb; }
    .bw-cal-day.today    { font-weight: 700; }
    .bw-cal-day.selected { background: #2563eb; color: #fff; border-radius: 6px; }
    .bw-cal-day.in-range { background: #dbeafe; border-radius: 0; }
    .bw-cal-day.range-start { background: #2563eb; color: #fff; border-radius: 6px 0 0 6px; }
    .bw-cal-day.range-end   { background: #2563eb; color: #fff; border-radius: 0 6px 6px 0; }
    .bw-cal-day.disabled { color: #d1d5db; cursor: not-allowed; text-decoration: line-through; }
    .bw-cal-day.empty    { cursor: default; }
    .bw-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid #fff;
                  border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .bw-loading { text-align: center; padding: 32px; color: #9ca3af; font-size: .9rem; }
  `;

  // ─── Utilities ───────────────────────────────────────────────────────────────
  function formatDate(d) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function isoDate(d) {
    return d.toISOString().slice(0, 10);
  }
  function addDays(d, n) {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
  }
  function sameDay(a, b) {
    return a && b && isoDate(a) === isoDate(b);
  }

  // ─── Calendar component ──────────────────────────────────────────────────────
  function renderCalendar(el, state, bookedDates, onSelect) {
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    const today = new Date(); today.setHours(0,0,0,0);
    const year  = state.calYear;
    const month = state.calMonth;
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const booked = new Set(bookedDates || []);

    let html = `
      <div class="bw-calendar">
        <div class="bw-cal-header">
          <button class="bw-cal-nav" data-nav="-1">&#8249;</button>
          <span class="bw-cal-month">${MONTHS[month]} ${year}</span>
          <button class="bw-cal-nav" data-nav="1">&#8250;</button>
        </div>
        <div class="bw-cal-grid">
          ${DAYS.map(d => `<div class="bw-cal-day-name">${d}</div>`).join('')}
    `;

    for (let i = 0; i < startPad; i++) {
      html += `<div class="bw-cal-day empty"></div>`;
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const date  = new Date(year, month, day);
      const iso   = isoDate(date);
      const isPast     = date < today;
      const isBooked   = booked.has(iso);
      const isDisabled = isPast || isBooked;
      const isToday    = sameDay(date, today);

      let cls = 'bw-cal-day';
      if (isDisabled) cls += ' disabled';
      if (isToday)    cls += ' today';

      if (state.mode === 'range') {
        const { checkIn, checkOut } = state;
        if (sameDay(date, checkIn) && checkOut)  cls += ' range-start';
        else if (sameDay(date, checkOut))         cls += ' range-end';
        else if (checkIn && checkOut && date > checkIn && date < checkOut) cls += ' in-range';
        else if (sameDay(date, checkIn))          cls += ' selected';
      } else {
        if (sameDay(date, state.selectedDate))    cls += ' selected';
      }

      html += `<div class="${cls}" data-date="${iso}" ${isDisabled ? '' : 'data-pick'}>${day}</div>`;
    }

    html += `</div></div>`;
    el.innerHTML = html;

    el.querySelectorAll('[data-pick]').forEach(d => {
      d.addEventListener('click', () => onSelect(new Date(d.dataset.date + 'T00:00:00')));
    });
    el.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = parseInt(btn.dataset.nav);
        let m = state.calMonth + delta;
        let y = state.calYear;
        if (m > 11) { m = 0; y++; }
        if (m < 0)  { m = 11; y--; }
        state.calMonth = m;
        state.calYear  = y;
        renderCalendar(el, state, bookedDates, onSelect);
      });
    });
  }

  // ─── Widget class ─────────────────────────────────────────────────────────────
  class BookingWidget {
    constructor(root, config) {
      this.root    = root;
      this.config  = config;
      this.db      = createClient(config.supabaseUrl, config.supabaseKey);
      this.state   = {
        step: 1,
        loading: false,
        error: null,
        // Shared
        business: null,
        // Hotel
        checkIn: null,
        checkOut: null,
        guests: 1,
        availableRooms: [],
        selectedRoom: null,
        selectedService: null,
        // Salon
        selectedStaff: null,
        staffList: [],
        serviceList: [],
        selectedDate: null,
        availableSlots: [],
        selectedSlot: null,
        // Calendar nav
        calYear: new Date().getFullYear(),
        calMonth: new Date().getMonth(),
        calMode: 'range',
        bookedDates: [],
        // Customer
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        notes: '',
      };
      this.init();
    }

    async init() {
      this.injectStyles();
      this.setState({ loading: true });
      try {
        const rows = await this.db.from('businesses').then(t =>
          t.select('*', { id: `eq.${this.config.businessId}` })
        );
        if (!rows.length) throw new Error('Business not found');
        this.state.business = rows[0];
        if (this.state.business.type === 'salon') {
          await this.loadSalonData();
        }
        this.setState({ loading: false });
        this.render();
      } catch (e) {
        this.setState({ loading: false, error: e.message || 'Failed to load.' });
        this.render();
      }
    }

    async loadSalonData() {
      const biz = this.state.business;
      const [staff, services] = await Promise.all([
        this.db.from('resources').then(t =>
          t.select('*', { business_id: `eq.${biz.id}`, type: 'eq.staff', is_active: 'eq.true' })
        ),
        this.db.from('services').then(t =>
          t.select('*', { business_id: `eq.${biz.id}`, is_active: 'eq.true' })
        ),
      ]);
      this.state.staffList   = staff;
      this.state.serviceList = services;
    }

    setState(patch) {
      Object.assign(this.state, patch);
    }

    injectStyles() {
      if (document.getElementById('bw-styles')) return;
      const style = document.createElement('style');
      style.id = 'bw-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    totalSteps() {
      return this.state.business?.type === 'hotel' ? 4 : 4;
    }

    render() {
      const { loading, error, business } = this.state;

      if (loading) {
        this.root.innerHTML = `<div class="bw-widget"><div class="bw-card"><div class="bw-loading">Loading...</div></div></div>`;
        return;
      }
      if (error && !business) {
        this.root.innerHTML = `<div class="bw-widget"><div class="bw-card"><div class="bw-error">${error}</div></div></div>`;
        return;
      }

      const type = business.type;
      this.root.innerHTML = `
        <div class="bw-widget">
          <div class="bw-card">
            <div class="bw-title">${type === 'hotel' ? 'Book Your Stay' : 'Book an Appointment'}</div>
            ${this.renderSteps()}
            <div id="bw-content"></div>
          </div>
        </div>
      `;

      const content = this.root.querySelector('#bw-content');
      if (type === 'hotel')  this.renderHotelStep(content);
      else                   this.renderSalonStep(content);

      this.bindActions();
    }

    renderSteps() {
      const total = this.totalSteps();
      const step  = this.state.step;
      let html = '<div class="bw-steps">';
      for (let i = 1; i <= total; i++) {
        let cls = 'bw-step';
        if (i < step)  cls += ' done';
        if (i === step) cls += ' active';
        html += `<div class="${cls}"></div>`;
      }
      return html + '</div>';
    }

    // ── HOTEL STEPS ──────────────────────────────────────────────────────────────
    renderHotelStep(el) {
      const { step, error } = this.state;
      const err = error ? `<div class="bw-error">${error}</div>` : '';

      if (step === 1) el.innerHTML = err + this.hotelStep1();
      if (step === 2) el.innerHTML = err + this.hotelStep2();
      if (step === 3) el.innerHTML = err + this.hotelStep3();
      if (step === 4) el.innerHTML = this.stepSuccess();

      if (step === 1) {
        const calEl = el.querySelector('#bw-calendar');
        renderCalendar(calEl, { ...this.state, mode: 'range' }, this.state.bookedDates, (d) => {
          if (!this.state.checkIn || (this.state.checkIn && this.state.checkOut)) {
            this.setState({ checkIn: d, checkOut: null });
          } else if (d > this.state.checkIn) {
            this.setState({ checkOut: d });
          } else {
            this.setState({ checkIn: d, checkOut: null });
          }
          this.render();
        });
      }
    }

    hotelStep1() {
      const { checkIn, checkOut, guests } = this.state;
      const nights = checkIn && checkOut
        ? Math.round((checkOut - checkIn) / 86400000)
        : 0;
      return `
        <div class="bw-col">
          <label class="bw-label">Select Dates</label>
          <div id="bw-calendar"></div>
          ${checkIn ? `<div style="font-size:.85rem;color:#374151;margin-bottom:8px;">
            ${checkOut
              ? `<strong>${formatDate(checkIn)}</strong> → <strong>${formatDate(checkOut)}</strong> &nbsp;(${nights} night${nights !== 1 ? 's' : ''})`
              : `Check-in: <strong>${formatDate(checkIn)}</strong> — select check-out`}
          </div>` : ''}
        </div>
        <div class="bw-col">
          <label class="bw-label">Guests</label>
          <input class="bw-input" type="number" id="bw-guests" min="1" max="10" value="${guests}" style="width:100px;">
        </div>
        <div class="bw-actions">
          <span></span>
          <button class="bw-btn bw-btn-primary" id="bw-next"
            ${checkIn && checkOut ? '' : 'disabled'}>
            Search Rooms →
          </button>
        </div>
      `;
    }

    hotelStep2() {
      const { availableRooms, selectedRoom, loading } = this.state;
      if (loading) return `<div class="bw-loading">Checking availability...</div>`;
      if (!availableRooms.length) return `
        <div class="bw-error">No rooms available for the selected dates. Please try different dates.</div>
        <div class="bw-actions">
          <button class="bw-btn bw-btn-secondary" id="bw-back">← Back</button>
        </div>
      `;
      const cards = availableRooms.map(r => `
        <div class="bw-card-opt ${selectedRoom?.id === r.id ? 'selected' : ''}"
             data-select-room="${r.id}">
          <div class="opt-name">${r.name}</div>
          <div class="opt-sub">${r.description || ''}</div>
          <div class="opt-sub">Up to ${r.capacity} guests</div>
        </div>
      `).join('');
      return `
        <label class="bw-label">Available Rooms</label>
        <div class="bw-grid">${cards}</div>
        <div class="bw-actions">
          <button class="bw-btn bw-btn-secondary" id="bw-back">← Back</button>
          <button class="bw-btn bw-btn-primary" id="bw-next"
            ${selectedRoom ? '' : 'disabled'}>Choose Rate →</button>
        </div>
      `;
    }

    hotelStep3() {
      const { selectedService, business } = this.state;
      // Load services for this business (loaded async)
      return `
        <div id="bw-services-container"><div class="bw-loading">Loading rates...</div></div>
        <div class="bw-col" style="margin-top:14px;">
          <label class="bw-label">Full Name</label>
          <input class="bw-input" id="bw-name" placeholder="John Doe" value="${this.state.customerName}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Email</label>
          <input class="bw-input" id="bw-email" type="email" placeholder="john@email.com" value="${this.state.customerEmail}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Phone (optional)</label>
          <input class="bw-input" id="bw-phone" type="tel" placeholder="+385..." value="${this.state.customerPhone}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Notes (optional)</label>
          <textarea class="bw-input" id="bw-notes" rows="2" placeholder="Any special requests...">${this.state.notes}</textarea>
        </div>
        <div class="bw-actions">
          <button class="bw-btn bw-btn-secondary" id="bw-back">← Back</button>
          <button class="bw-btn bw-btn-primary" id="bw-submit" disabled>
            Confirm & Pay
          </button>
        </div>
      `;
    }

    // ── SALON STEPS ──────────────────────────────────────────────────────────────
    renderSalonStep(el) {
      const { step, error } = this.state;
      const err = error ? `<div class="bw-error">${error}</div>` : '';
      if (step === 1) el.innerHTML = err + this.salonStep1();
      if (step === 2) el.innerHTML = err + this.salonStep2();
      if (step === 3) el.innerHTML = err + this.salonStep3();
      if (step === 4) el.innerHTML = this.stepSuccess();

      if (step === 2) {
        const calEl = el.querySelector('#bw-calendar');
        if (calEl) {
          renderCalendar(calEl, { ...this.state, mode: 'single' }, [], (d) => {
            this.setState({ selectedDate: d, selectedSlot: null, availableSlots: [] });
            this.loadSlots();
          });
        }
      }
    }

    salonStep1() {
      const { staffList, serviceList, selectedStaff, selectedService } = this.state;
      const staffCards = staffList.map(s => `
        <div class="bw-card-opt ${selectedStaff?.id === s.id ? 'selected' : ''}"
             data-select-staff="${s.id}">
          <div class="opt-name">${s.name}</div>
          <div class="opt-sub">${s.description || ''}</div>
        </div>
      `).join('');
      const svcCards = serviceList.map(s => `
        <div class="bw-card-opt ${selectedService?.id === s.id ? 'selected' : ''}"
             data-select-service="${s.id}">
          <div class="opt-name">${s.name}</div>
          <div class="opt-sub">${s.duration_minutes} min</div>
          <div class="opt-price">€${s.price}</div>
        </div>
      `).join('');
      return `
        <label class="bw-label">Choose Stylist</label>
        <div class="bw-grid">${staffCards}</div>
        <label class="bw-label">Choose Service</label>
        <div class="bw-grid">${svcCards}</div>
        <div class="bw-actions">
          <span></span>
          <button class="bw-btn bw-btn-primary" id="bw-next"
            ${selectedStaff && selectedService ? '' : 'disabled'}>
            Pick a Date →
          </button>
        </div>
      `;
    }

    salonStep2() {
      const { selectedDate, availableSlots, selectedSlot, loading } = this.state;
      const slots = loading
        ? `<div class="bw-loading">Loading slots...</div>`
        : availableSlots.length
          ? `<div class="bw-slots">${availableSlots.map(s => `
              <div class="bw-slot ${selectedSlot?.slot_start === s.slot_start ? 'selected' : ''}"
                   data-slot-start="${s.slot_start}" data-slot-end="${s.slot_end}">
                ${formatTime(s.slot_start)}
              </div>`).join('')}
            </div>`
          : selectedDate
            ? `<div style="font-size:.85rem;color:#6b7280;margin-bottom:14px;">No slots available on this day.</div>`
            : '';
      return `
        <label class="bw-label">Select a Date</label>
        <div id="bw-calendar"></div>
        ${selectedDate ? `<label class="bw-label">Available Times — ${formatDate(selectedDate)}</label>` : ''}
        ${slots}
        <div class="bw-actions">
          <button class="bw-btn bw-btn-secondary" id="bw-back">← Back</button>
          <button class="bw-btn bw-btn-primary" id="bw-next"
            ${selectedSlot ? '' : 'disabled'}>
            Your Details →
          </button>
        </div>
      `;
    }

    salonStep3() {
      return `
        <div class="bw-col">
          <label class="bw-label">Full Name</label>
          <input class="bw-input" id="bw-name" placeholder="Ana Horvat" value="${this.state.customerName}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Email</label>
          <input class="bw-input" id="bw-email" type="email" placeholder="ana@email.com" value="${this.state.customerEmail}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Phone (optional)</label>
          <input class="bw-input" id="bw-phone" type="tel" placeholder="+385..." value="${this.state.customerPhone}">
        </div>
        <div class="bw-col">
          <label class="bw-label">Notes (optional)</label>
          <textarea class="bw-input" id="bw-notes" rows="2" placeholder="Any preferences...">${this.state.notes}</textarea>
        </div>
        <div class="bw-actions">
          <button class="bw-btn bw-btn-secondary" id="bw-back">← Back</button>
          <button class="bw-btn bw-btn-primary" id="bw-submit">
            Confirm Appointment
          </button>
        </div>
      `;
    }

    stepSuccess() {
      const type = this.state.business.type;
      return `
        <div class="bw-success">
          <div class="bw-success-icon">✓</div>
          <h3>${type === 'hotel' ? 'Booking Request Sent!' : 'Appointment Booked!'}</h3>
          <p>We'll send a confirmation to <strong>${this.state.customerEmail}</strong>.</p>
          ${type === 'hotel'
            ? `<p style="margin-top:8px;font-size:.82rem;color:#6b7280;">
                Check-in: ${formatDate(this.state.checkIn)} &nbsp;·&nbsp;
                Check-out: ${formatDate(this.state.checkOut)}
               </p>`
            : `<p style="margin-top:8px;font-size:.82rem;color:#6b7280;">
                ${formatDate(this.state.selectedDate)} at ${formatTime(this.state.selectedSlot.slot_start)}
                with ${this.state.selectedStaff.name}
               </p>`
          }
        </div>
      `;
    }

    // ── Actions / event binding ──────────────────────────────────────────────────
    bindActions() {
      const root = this.root;

      // Room selection
      root.querySelectorAll('[data-select-room]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.selectRoom;
          this.setState({ selectedRoom: this.state.availableRooms.find(r => r.id === id) });
          this.render();
        });
      });

      // Staff selection
      root.querySelectorAll('[data-select-staff]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.selectStaff;
          this.setState({
            selectedStaff: this.state.staffList.find(s => s.id === id),
            selectedService: null,
          });
          this.render();
        });
      });

      // Service selection
      root.querySelectorAll('[data-select-service]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.selectService;
          this.setState({ selectedService: this.state.serviceList.find(s => s.id === id) });
          this.render();
        });
      });

      // Slot selection
      root.querySelectorAll('[data-slot-start]').forEach(el => {
        el.addEventListener('click', () => {
          this.setState({ selectedSlot: { slot_start: el.dataset.slotStart, slot_end: el.dataset.slotEnd } });
          this.render();
        });
      });

      // Guests input
      const guestsEl = root.querySelector('#bw-guests');
      if (guestsEl) guestsEl.addEventListener('change', () => {
        this.setState({ guests: parseInt(guestsEl.value) || 1 });
      });

      // Navigation
      const nextBtn = root.querySelector('#bw-next');
      const backBtn = root.querySelector('#bw-back');
      const submitBtn = root.querySelector('#bw-submit');

      if (nextBtn) nextBtn.addEventListener('click', () => this.handleNext());
      if (backBtn) backBtn.addEventListener('click', () => {
        this.setState({ step: this.state.step - 1, error: null });
        this.render();
      });
      if (submitBtn) submitBtn.addEventListener('click', () => this.handleSubmit());

      // Hotel step 3: load services + enable submit on form fill
      if (this.state.business.type === 'hotel' && this.state.step === 3) {
        this.loadHotelServices();
        this.watchFormValidity();
      }
      if (this.state.business.type === 'salon' && this.state.step === 3) {
        this.watchFormValidity();
      }
    }

    watchFormValidity() {
      const check = () => {
        const name  = this.root.querySelector('#bw-name')?.value.trim();
        const email = this.root.querySelector('#bw-email')?.value.trim();
        const btn   = this.root.querySelector('#bw-submit');
        if (btn) btn.disabled = !(name && email);
        // Capture values
        if (name)  this.state.customerName  = name;
        if (email) this.state.customerEmail = email;
        const phone = this.root.querySelector('#bw-phone')?.value.trim();
        const notes = this.root.querySelector('#bw-notes')?.value.trim();
        if (phone !== undefined) this.state.customerPhone = phone;
        if (notes !== undefined) this.state.notes = notes;
      };
      this.root.querySelectorAll('#bw-name, #bw-email, #bw-phone, #bw-notes').forEach(el => {
        el.addEventListener('input', check);
      });
      check();
    }

    async loadHotelServices() {
      const container = this.root.querySelector('#bw-services-container');
      if (!container) return;
      try {
        const services = await this.db.from('services').then(t =>
          t.select('*', { business_id: `eq.${this.state.business.id}`, is_active: 'eq.true' })
        );
        this.state.serviceList = services;
        const { selectedService } = this.state;
        const cards = services.map(s => `
          <div class="bw-card-opt ${selectedService?.id === s.id ? 'selected' : ''}"
               data-select-svc="${s.id}">
            <div class="opt-name">${s.name}</div>
            <div class="opt-sub">${s.description || ''}</div>
            <div class="opt-price">€${s.price} / night</div>
          </div>
        `).join('');
        container.innerHTML = `
          <label class="bw-label">Rate Plan</label>
          <div class="bw-grid">${cards}</div>
        `;
        container.querySelectorAll('[data-select-svc]').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.selectSvc;
            this.setState({ selectedService: services.find(s => s.id === id) });
            container.querySelectorAll('[data-select-svc]').forEach(e =>
              e.classList.toggle('selected', e.dataset.selectSvc === id)
            );
          });
        });
      } catch(e) {
        container.innerHTML = `<div class="bw-error">Failed to load rates.</div>`;
      }
    }

    async loadSlots() {
      const { selectedStaff, selectedService, selectedDate } = this.state;
      if (!selectedStaff || !selectedService || !selectedDate) return;
      this.setState({ loading: true, availableSlots: [] });
      this.render();
      try {
        const slots = await this.db.rpc('get_available_slots', {
          p_resource_id: selectedStaff.id,
          p_service_id:  selectedService.id,
          p_date:        isoDate(selectedDate),
        });
        this.setState({ availableSlots: slots || [], loading: false });
      } catch (e) {
        this.setState({ loading: false, error: 'Could not load available times.' });
      }
      this.render();
    }

    async handleNext() {
      const { step, business, checkIn, checkOut, guests } = this.state;

      if (business.type === 'hotel' && step === 1) {
        this.setState({ step: 2, loading: true, error: null });
        this.render();
        try {
          const rooms = await this.db.rpc('get_available_rooms', {
            p_business_id: business.id,
            p_check_in:    isoDate(checkIn),
            p_check_out:   isoDate(checkOut),
            p_guests:      guests,
          });
          this.setState({ availableRooms: rooms || [], loading: false });
        } catch (e) {
          this.setState({ loading: false, error: 'Failed to check availability.' });
        }
        this.render();
        return;
      }

      this.setState({ step: step + 1, error: null });
      this.render();
    }

    async handleSubmit() {
      const { business, selectedRoom, selectedStaff, selectedService,
              checkIn, checkOut, selectedSlot, guests,
              customerName, customerEmail, customerPhone, notes } = this.state;

      const btn = this.root.querySelector('#bw-submit');
      if (btn) { btn.disabled = true; btn.innerHTML = `<span class="bw-spinner"></span>`; }

      const payload = {
        business_id:    business.id,
        resource_id:    business.type === 'hotel' ? selectedRoom.id : selectedStaff.id,
        service_id:     selectedService?.id || null,
        customer_name:  customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        notes:          notes || null,
      };

      if (business.type === 'hotel') {
        payload.start_datetime = checkIn.toISOString();
        payload.end_datetime   = checkOut.toISOString();
        payload.guests         = guests;
      } else {
        payload.start_datetime = selectedSlot.slot_start;
        payload.end_datetime   = selectedSlot.slot_end;
      }

      try {
        const res = await fetch(this.config.workerUrl + '/api/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }

        const { booking_id, cart_url } = await res.json();

        // Store booking summary in localStorage so the CloudCart checkout
        // page JS snippet can populate the order note field
        try {
          localStorage.setItem('bw_pending_booking', JSON.stringify({
            booking_id,
            customer_name:  customerName,
            customer_email: customerEmail,
            service_name:   selectedService?.name || '',
            resource_name:  business.type === 'hotel'
                              ? selectedRoom?.name
                              : selectedStaff?.name,
            ts: Date.now(),
          }));
        } catch (_) { /* localStorage unavailable — proceed anyway */ }

        // Redirect to CloudCart cart
        window.location.href = cart_url;

      } catch (e) {
        const msg = e?.message || 'Booking failed. Please try again.';
        this.setState({ error: msg });
        if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Pay'; }
        this.render();
      }
    }
  }

  // ─── Auto-init all widgets on page ───────────────────────────────────────────
  function init() {
    document.querySelectorAll('[data-cloudcart-booking]').forEach(el => {
      const config = {
        businessId:   el.dataset.businessId,
        supabaseUrl:  el.dataset.supabaseUrl,
        supabaseKey:  el.dataset.supabaseKey,
        workerUrl:    el.dataset.workerUrl || 'https://booking-admin.e-kurtisi.workers.dev',
      };
      if (!config.businessId || !config.supabaseUrl || !config.supabaseKey) {
        el.innerHTML = '<div style="color:red;font-size:.85rem;">Booking widget: missing data attributes.</div>';
        return;
      }
      new BookingWidget(el, config);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
