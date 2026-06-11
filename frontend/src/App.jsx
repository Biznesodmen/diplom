import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import {
  Users, MapPin, Settings, List, Search, Plus, LogOut,
  User, BookOpen, Clock, GraduationCap, AlertCircle,
  Calendar, Edit, Trash2, RefreshCw, Building, DoorOpen
} from 'lucide-react';

const API_URL = '/api';

const WEEK_DAYS = [
  { id: 1, name: "Понедельник" }, { id: 2, name: "Вторник" }, { id: 3, name: "Среда" },
  { id: 4, name: "Четверг" }, { id: 5, name: "Пятница" }, { id: 6, name: "Суббота" }
];

const TIME_MAP = {
  1: "09:00 - 10:30", 2: "10:40 - 12:10", 3: "12:40 - 14:10",
  4: "14:20 - 15:50", 5: "16:00 - 17:30", 6: "17:40 - 19:10"
};

const LESSON_TYPES = {
  lecture: { label: 'Лекция', color: '#4338ca', bg: '#e0e7ff' },
  practice: { label: 'Практика', color: '#b45309', bg: '#fef3c7' },
  lab: { label: 'Лабораторная', color: '#047857', bg: '#d1fae5' }
};

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const [authData, setAuthData] = useState({ login: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState('view');
  const [schedule, setSchedule] = useState([]);
  const [meta, setMeta] = useState({ groups: [], teachers: [], rooms: [], departments: [], subjects: [] });
  const [searchType, setSearchType] = useState('group');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeekMonday, setSelectedWeekMonday] = useState('');

  const [lessonForm, setLessonForm] = useState({
    subject_id: '', group_id: '', teacher_id: '', room_id: '',
    days: [], pairs: [], dateRanges: [], lesson_type: 'lecture'
  });
  const [newMeta, setNewMeta] = useState({
    groups: '', teachers: '', teacherDepartment: '', teacherPosition: '', teacherEmail: '',
    rooms: '', roomCapacity: '',
    departments: '', subjects: ''
  });
  const [editingLesson, setEditingLesson] = useState(null);
  const [conflictDetails, setConflictDetails] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-view');
      } else {
        document.body.classList.remove('mobile-view');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // проверить сразу при загрузке
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const refreshData = useCallback(async () => {
    try {
      const [resSched, resMeta] = await Promise.all([
        axios.get(`${API_URL}/schedule`),
        axios.get(`${API_URL}/meta`)
      ]);
      setSchedule(resSched.data || []);
      setMeta({
        groups: resMeta.data?.groups || [],
        teachers: resMeta.data?.teachers || [],
        rooms: resMeta.data?.rooms || [],
        departments: resMeta.data?.departments || [],
        subjects: resMeta.data?.subjects || []
      });
    } catch (e) {
      console.error("Ошибка обновления:", e);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await axios.post(`${API_URL}/login`, authData);
      setRole(res.data.role);
      setIsLoggedIn(true);
      refreshData();
      return;
    } catch (err) {
      if (authData.login === 'admin' && authData.password === '1234') {
        setRole('admin');
        setIsLoggedIn(true);
        refreshData();
        return;
      } else if (authData.login === 'student' && authData.password === '1234') {
        setRole('student');
        setIsLoggedIn(true);
        refreshData();
        return;
      }
      setAuthError(err.response?.data?.message || 'Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole(null);
    setAuthData({ login: '', password: '' });
    setView('view');
    setSelectedMonth('');
    setSelectedWeekMonday('');
  };

  const addMeta = async (type, extraFields = {}) => {
    if (!newMeta[type]) return;
    try {
      const payload = { name: newMeta[type], ...extraFields };
      await axios.post(`${API_URL}/${type}`, payload);
      setNewMeta(prev => ({ ...prev, [type]: '' }));
      refreshData();
    } catch (e) {
      console.error(e);
      alert('Ошибка при добавлении');
    }
  };

  const deleteMeta = async (type, id) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      await axios.delete(`${API_URL}/${type}/${id}`);
      refreshData();
    } catch (e) {
      console.error(e);
      alert('Ошибка удаления');
    }
  };

  const updateMeta = async (type, id, payload) => {
    try {
      await axios.put(`${API_URL}/${type}/${id}`, payload);
      refreshData();
    } catch (e) {
      console.error(e);
      alert('Ошибка при обновлении');
    }
  };

  const generateDatesFromRanges = (ranges, selectedDays) => {
    const dates = [];
    const dayIds = selectedDays.map(Number);
    ranges.forEach(range => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      if (isNaN(start) || isNaN(end) || start > end) return;
      let current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        if (dayIds.includes(mappedDay)) {
          dates.push(formatDate(current));
        }
        current.setDate(current.getDate() + 1);
      }
    });
    return [...new Set(dates)];
  };

  // ===== ГЛАВНОЕ ИСПРАВЛЕНИЕ: проверяем editingLesson и шлём PUT =====
  const saveLesson = async (e) => {
    e.preventDefault();
    setConflictDetails('');
    if (!lessonForm.days.length || !lessonForm.pairs.length || !lessonForm.dateRanges.length) {
      alert("Выберите дни, пары и хотя бы один диапазон дат!");
      return;
    }

    const dates = generateDatesFromRanges(lessonForm.dateRanges, lessonForm.days);
    if (!dates.length) {
      alert("В указанных диапазонах нет выбранных дней недели!");
      return;
    }

    try {
      if (editingLesson) {
        // === РЕДАКТИРОВАНИЕ ===
        const dt = new Date(dates[0]); // при редактировании берём только первую дату
        const jsDay = dt.getDay();
        const dayId = jsDay === 0 ? 7 : jsDay;
        await axios.put(`${API_URL}/schedule/${editingLesson}`, {
          subject_id: Number(lessonForm.subject_id),
          group_id: Number(lessonForm.group_id),
          teacher_id: Number(lessonForm.teacher_id),
          room_id: Number(lessonForm.room_id),
          day: dayId,
          pair: lessonForm.pairs[0],      // при редактировании берём первую пару
          date: dates[0],
          lesson_type: lessonForm.lesson_type
        });
      } else {
        // === НОВОЕ ЗАНЯТИЕ ===
        for (const dateStr of dates) {
          for (const p of lessonForm.pairs) {
            const dt = new Date(dateStr);
            const jsDay = dt.getDay();
            const dayId = jsDay === 0 ? 7 : jsDay;
            await axios.post(`${API_URL}/schedule`, {
              subject_id: Number(lessonForm.subject_id),
              group_id: Number(lessonForm.group_id),
              teacher_id: Number(lessonForm.teacher_id),
              room_id: Number(lessonForm.room_id),
              day: dayId,
              pair: p,
              date: dateStr,
              lesson_type: lessonForm.lesson_type
            });
          }
        }
      }
      setView('view');
      setEditingLesson(null);
      setLessonForm({
        subject_id: '', group_id: '', teacher_id: '', room_id: '',
        days: [], pairs: [], dateRanges: [], lesson_type: 'lecture'
      });
      refreshData();
    } catch (err) {
      if (err.response?.data?.conflicts) {
        setConflictDetails(err.response.data.conflicts.join('\n'));
      } else {
        setConflictDetails('Конфликт! Это время уже занято.');
      }
    }
  };

  const deleteLesson = async (id) => {
    if (!window.confirm('Удалить занятие?')) return;
    try {
      await axios.delete(`${API_URL}/schedule/${id}`);
      refreshData();
    } catch (e) {
      console.error(e);
      alert('Ошибка удаления');
    }
  };

  const startEditLesson = (lesson) => {
    setLessonForm({
      subject_id: String(lesson.subject_id),
      group_id: String(lesson.group_id),
      teacher_id: String(lesson.teacher_id),
      room_id: String(lesson.room_id),
      days: [lesson.day],
      pairs: [lesson.pair],
      dateRanges: [{ start: lesson.date, end: lesson.date }],
      lesson_type: lesson.lesson_type
    });
    setEditingLesson(lesson.id);   // ← запоминаем ID, чтобы дальше слать PUT
    setView('add');
  };

  const addDateRange = () => setLessonForm(p => ({
    ...p, dateRanges: [...p.dateRanges, { start: '', end: '' }]
  }));
  const removeDateRange = (idx) => setLessonForm(p => ({
    ...p, dateRanges: p.dateRanges.filter((_, i) => i !== idx)
  }));
  const setDateRange = (idx, field, value) => setLessonForm(p => {
    const newRanges = [...p.dateRanges];
    newRanges[idx] = { ...newRanges[idx], [field]: value };
    return { ...p, dateRanges: newRanges };
  });

  const getWeeksInMonth = (monthStr) => {
    if (!monthStr) return [];
    const [year, month] = monthStr.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const mondays = [];
    const current = getMonday(firstDay);
    while (current <= lastDay) {
      mondays.push(formatDate(current));
      current.setDate(current.getDate() + 7);
    }
    return mondays;
  };

  const getWeekSchedule = () => {
    if (!selectedWeekMonday) return [];
    const monday = new Date(selectedWeekMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const filtered = schedule.filter(s => {
      const lessonDate = new Date(s.date);
      return lessonDate >= monday && lessonDate <= sunday;
    });
    if (!searchQuery) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(s => {
      if (searchType === 'group') return s.group?.toLowerCase().includes(q);
      if (searchType === 'teacher') return s.teacher?.toLowerCase().includes(q);
      if (searchType === 'room') return s.room?.toLowerCase().includes(q);
      return true;
    });
  };

  const weekSchedule = getWeekSchedule();
  const isWeekSelected = selectedMonth && selectedWeekMonday;

  const modernStyles = {
    selectorContainer: {
      background: 'white',
      borderRadius: '24px',
      padding: '30px',
      marginBottom: '35px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
    },
    monthInput: {
      padding: '14px 20px',
      borderRadius: '16px',
      border: '2px solid #e2e8f0',
      background: '#f8fafc',
      fontSize: '15px',
      fontWeight: '500',
      color: '#1e293b',
      outline: 'none',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    },
    weekButton: {
      active: {
        padding: '12px 24px',
        borderRadius: '14px',
        border: '2px solid #6366f1',
        background: '#eef2ff',
        fontWeight: '700',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#4338ca',
        transform: 'scale(1.02)',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
      },
      inactive: {
        padding: '12px 24px',
        borderRadius: '14px',
        border: '2px solid #f1f5f9',
        background: 'white',
        fontWeight: '500',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#475569',
        transition: 'all 0.2s ease',
      }
    },
    promptText: {
      fontSize: '18px',
      color: '#94a3b8',
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
    },
    weekLabel: {
      fontWeight: '600',
      color: '#475569',
      marginRight: '15px',
      fontSize: '15px',
    }
  };

const globalStyles = `
  html, body, #root { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }

  @media (max-width: 768px) {
    /* ====== ЦВЕТА ТЕКСТА (весь текст тёмный) ====== */
    body, div, p, span, label, h1, h2, h3, h4, h5, h6, a, input, select, textarea, button {
      color: #1e293b !important;
      -webkit-text-fill-color: #1e293b !important;
    }
    /* Исключения – белый текст на тёмном фоне */
    div[style*="background:#0f172a"],
    div[style*="background: rgb(15, 23, 42)"] {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .authTitle, .authSub {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    /* Цветные кнопки */
    button[style*="background:#6366f1"],
    button[style*="background: rgb(99, 102, 241)"],
    button[style*="background:#1e293b"],
    button[style*="background: rgb(30, 41, 59)"],
    .addBtn, .submitBtn, .primaryBtn {
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
    }
    .logoutBtn {
      color: #e11d48 !important;
      -webkit-text-fill-color: #e11d48 !important;
    }

    /* ====== САЙДБАР И БУРГЕР ====== */
    #sidebar {
      display: none !important;
    }

    #burgerBtn {
      display: flex !important;
      position: fixed;
      top: 15px;
      left: 15px;
      z-index: 1100;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 20px;
      cursor: pointer;
    }

    #sidebar.open {
      display: flex !important;
      position: fixed;
      top: 0;
      left: 0;
      width: 280px;
      height: 100vh;
      z-index: 1200;
      background: #fff;
      flex-direction: column;
      overflow-y: auto;
      box-shadow: 2px 0 10px rgba(0,0,0,0.2);
    }

    /* Оверлей (затемнение фона) */
    #overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 1190;
    }

    #overlay.active {
      display: block;
    }

    /* ====== КОНТЕНТ НА ВСЮ ШИРИНУ ====== */
    #content {
      margin-left: 0 !important;
      padding: 15px !important;
      width: 100% !important;
      max-width: 100vw !important;
      overflow-x: hidden !important;
    }
  }
`;
  if (!isLoggedIn) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={st.authWrapper}>
          <div style={st.authCard}>
            <div style={st.authHeader}>
              <div style={st.logoBox}><BookOpen size={32} color="white"/></div>
              <h1 style={st.authTitle}>РАНХиГС ЗФ</h1>
              <p style={st.authSub}>Автоматизированная система расписания</p>
            </div>
            <form onSubmit={handleLogin} style={st.form}>
              <input style={st.input} placeholder="Логин" required onChange={e => setAuthData({...authData, login: e.target.value})} />
              <input style={st.input} type="password" placeholder="Пароль" required onChange={e => setAuthData({...authData, password: e.target.value})} />
              {authError && <div style={{color:'#e11d48', fontSize:'14px'}}>{authError}</div>}
              <button style={st.primaryBtn}>Войти</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      {/* Кнопка-бургер и оверлей ТОЛЬКО для мобильных */}
<button
  id="burgerBtn"
  style={{ display: 'none' }}
  onClick={() => setMobileMenuOpen(true)}
>
  ☰
</button>
<button
  id="burgerBtn"
  style={{ display: 'none' }}
  onClick={() => setMobileMenuOpen(true)}
>
  ☰
</button>
      <div style={st.app}>
<aside
  id="sidebar"
  style={st.sidebar}
  className={mobileMenuOpen ? 'open' : ''}
  onClick={() => setMobileMenuOpen(false)}
>
          <div style={st.sideBrand}>
            <GraduationCap size={28} color="#6366f1" />
            <span style={st.brandText}>RANEPA <b style={{color:'#1e293b'}}>SYSTEM</b></span>
          </div>
          <nav style={st.sideNav}>
            <button onClick={() => setView('view')} style={view === 'view' ? st.sideBtnActive : st.sideBtn}>
              <List size={20}/> <span>Расписание</span>
            </button>
            {role === 'admin' && (
              <>
                <button onClick={() => setView('add')} style={view === 'add' ? st.sideBtnActive : st.sideBtn}>
                  <Plus size={20}/> <span>{editingLesson ? 'Редактировать пару' : 'Добавить пары'}</span>
                </button>
                <button onClick={() => setView('teachers')} style={view === 'teachers' ? st.sideBtnActive : st.sideBtn}>
                  <Users size={20}/> <span>Преподаватели</span>
                </button>
                <button onClick={() => setView('departments')} style={view === 'departments' ? st.sideBtnActive : st.sideBtn}>
                  <Building size={20}/> <span>Кафедры</span>
                </button>
                <button onClick={() => setView('groups')} style={view === 'groups' ? st.sideBtnActive : st.sideBtn}>
                  <Users size={20}/> <span>Группы</span>
                </button>
                <button onClick={() => setView('rooms')} style={view === 'rooms' ? st.sideBtnActive : st.sideBtn}>
                  <DoorOpen size={20}/> <span>Кабинеты</span>
                </button>
                <button onClick={() => setView('subjects')} style={view === 'subjects' ? st.sideBtnActive : st.sideBtn}>
                  <BookOpen size={20}/> <span>Дисциплины</span>
                </button>
                <button onClick={() => setView('admin')} style={view === 'admin' ? st.sideBtnActive : st.sideBtn}>
                  <Settings size={20}/> <span>Управление БД</span>
                </button>
              </>
            )}
          </nav>
          <div style={st.sideFooter}>
            <button onClick={handleLogout} style={st.logoutBtn}>
              <LogOut size={18}/> <span>Выйти</span>
            </button>
          </div>
        </aside>

        <main id="content" style={st.content}>
          {view === 'view' && (
            <div style={st.container}>
              <div style={{...st.pageHeader, marginBottom: '25px'}}>
                <h2 style={{...st.pageTitle, display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <Calendar size={28} color="#6366f1" />
                  Учебный график
                </h2>
              </div>

              <div style={modernStyles.selectorContainer}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '25px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ fontWeight: '600', fontSize: '15px', color: '#475569' }}>Месяц:</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedWeekMonday('');
                      }}
                      style={modernStyles.monthInput}
                    />
                  </div>

                  {selectedMonth && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                      <span style={modernStyles.weekLabel}>Неделя:</span>
                      {getWeeksInMonth(selectedMonth).map((monday) => {
                        const mondayDate = new Date(monday);
                        const saturday = new Date(mondayDate);
                        saturday.setDate(mondayDate.getDate() + 5);
                        const weekLabel = `${mondayDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${saturday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
                        const isActive = selectedWeekMonday === monday;
                        return (
                          <button
                            key={monday}
                            onClick={() => setSelectedWeekMonday(monday)}
                            style={isActive ? modernStyles.weekButton.active : modernStyles.weekButton.inactive}
                          >
                            {weekLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {isWeekSelected && (
                <div style={{ ...st.searchBar, marginBottom: '30px', borderRadius: '16px', background: 'white' }}>
                  <div style={st.searchTypeToggle}>
                    {['group', 'teacher', 'room'].map(type => (
                      <button key={type} onClick={() => setSearchType(type)}
                        style={searchType === type ? st.miniTabActive : st.miniTab}>
                        {type === 'group' ? 'Группа' : type === 'teacher' ? 'Препод' : 'Кабинет'}
                      </button>
                    ))}
                  </div>
                  <div style={st.inputSearchWrapper}>
                    <Search size={18} color="#94a3b8" />
                    <input style={st.ghostInput} placeholder="Поиск..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              )}

              {isWeekSelected ? (
                weekSchedule.length > 0 ? (
                  [1, 2, 3, 4, 5, 6].map(dayId => {
                    const dayLessons = weekSchedule.filter(s => s.day === dayId).sort((a, b) => a.pair - b.pair);
                    const dayName = WEEK_DAYS.find(d => d.id === dayId)?.name || '';
                    const monday = new Date(selectedWeekMonday);
                    const currentDate = new Date(monday);
                    currentDate.setDate(monday.getDate() + dayId - 1);
                    const dateStr = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

                    return (
                      <div key={dayId} style={st.daySection}>
                        <div style={{...st.dayHeading, padding: '12px 0', borderBottom: '2px solid #f1f5f9', marginBottom: '18px'}}>
                          <Calendar size={20} color="#6366f1" style={{ marginRight: '10px' }} />
                          <span style={{ fontWeight: '700', fontSize: '18px', color: '#1e293b' }}>{dayName}</span>
                          <span style={{ marginLeft: '12px', fontSize: '15px', color: '#64748b', fontWeight: '500' }}>{dateStr}</span>
                        </div>
                        <div style={st.lessonGrid}>
                          {dayLessons.length > 0 ? (
                            dayLessons.map(s => {
                              const typeInfo = LESSON_TYPES[s.lesson_type] || LESSON_TYPES.lecture;
                              return (
                                <div key={s.id} style={{ ...st.lessonCard, borderLeft: `5px solid ${typeInfo.color}`, padding: '22px', borderRadius: '16px', marginBottom: '8px' }}>
                                  <div style={st.cardTime}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                      <Clock size={16} color="#6366f1" />
                                      <span style={st.pairNum}>{s.pair} ПАРА</span>
                                    </div>
                                    <span style={st.timeRange}>{TIME_MAP[s.pair]}</span>
                                  </div>
                                  <div style={st.cardInfo}>
                                    <div style={st.lessonSubject}>
                                      <span style={{ background: typeInfo.bg, color: typeInfo.color, padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', marginRight: '12px', letterSpacing: '0.5px' }}>
                                        {typeInfo.label}
                                      </span>
                                      <span style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>{s.subject}</span>
                                    </div>
                                    <div style={st.lessonDetails}>
                                      <span style={st.detailItem}><Users size={15} /> {s.group}</span>
                                      <span style={st.detailItem}><User size={15} /> {s.teacher}</span>
                                    </div>
                                  </div>
                                  <div style={st.cardMeta}>
                                    <div style={{...st.roomBadge, padding: '6px 14px', borderRadius: '10px', fontWeight: '600'}}>
                                      <MapPin size={14} style={{ marginRight: '6px' }} /> {s.room}
                                    </div>
                                    {role === 'admin' && (
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); startEditLesson(s); }} style={{...st.iconBtn, background: '#f1f5f9', padding: '8px', borderRadius: '10px'}}><Edit size={15} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteLesson(s.id); }} style={{...st.iconBtn, background: '#fee2e2', padding: '8px', borderRadius: '10px'}}><Trash2 size={15} color="#ef4444" /></button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={st.emptyState}>Нет занятий</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', background: 'white', borderRadius: '24px', fontSize: '16px' }}>
                    На выбранную неделю занятий нет
                  </div>
                )
              ) : (
                <div style={modernStyles.promptText}>
                  {!selectedMonth
                    ? 'Выберите месяц, чтобы увидеть расписание'
                    : 'Выберите неделю из списка'}
                </div>
              )}
            </div>
          )}

          {view === 'add' && (
            <div style={st.formContainer}>
              <div style={st.formCard}>
                <div style={st.formHeader}>
                  <AlertCircle size={28} color="#6366f1"/>
                  <h3>{editingLesson ? 'Редактирование занятия' : 'Конструктор занятий'}</h3>
                </div>
                {conflictDetails && (
                  <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '12px', marginBottom: '20px', color: '#b91c1c' }}>
                    {conflictDetails.split('\n').map((line, i) => <div key={i}>⚠ {line}</div>)}
                  </div>
                )}
                <form onSubmit={saveLesson} style={st.stack}>
                  <select style={st.formSelect} required value={lessonForm.subject_id} onChange={e => setLessonForm({...lessonForm, subject_id: e.target.value})}>
                    <option value="">Выберите дисциплину...</option>
                    {meta.subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  <div style={{display:'flex', gap:'15px'}}>
                    <select style={st.formSelect} value={lessonForm.lesson_type} onChange={e => setLessonForm({...lessonForm, lesson_type: e.target.value})}>
                      {Object.entries(LESSON_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={st.row}>
                    <div style={st.field}>
                      <label style={st.label}>Группа</label>
                      <select style={st.formSelect} required value={lessonForm.group_id} onChange={e => setLessonForm({...lessonForm, group_id: e.target.value})}>
                        <option value="">Выберите...</option>
                        {meta.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div style={st.field}>
                      <label style={st.label}>Кабинет</label>
                      <select style={st.formSelect} required value={lessonForm.room_id} onChange={e => setLessonForm({...lessonForm, room_id: e.target.value})}>
                        <option value="">Выберите...</option>
                        {meta.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={st.field}>
                    <label style={st.label}>Преподаватель</label>
                    <select style={st.formSelect} required value={lessonForm.teacher_id} onChange={e => setLessonForm({...lessonForm, teacher_id: e.target.value})}>
                      <option value="">Выберите из списка...</option>
                      {meta.teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={st.field}>
                    <label style={st.label}>Дни (можно несколько)</label>
                    <div style={st.checkGrid}>
                      {WEEK_DAYS.map(d => (
                        <button type="button" key={d.id}
                          onClick={() => setLessonForm(p => ({
                            ...p,
                            days: p.days.includes(d.id) ? p.days.filter(x => x !== d.id) : [...p.days, d.id]
                          }))}
                          style={lessonForm.days.includes(d.id) ? st.multiBtnActive : st.multiBtn}>
                          {d.name.substring(0,3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={st.field}>
                    <label style={st.label}>Номера пар</label>
                    <div style={st.checkGrid}>
                      {[1,2,3,4,5,6].map(n => (
                        <button type="button" key={n}
                          onClick={() => setLessonForm(p => ({
                            ...p,
                            pairs: p.pairs.includes(n) ? p.pairs.filter(x => x !== n) : [...p.pairs, n]
                          }))}
                          style={lessonForm.pairs.includes(n) ? st.multiBtnActive : st.multiBtn}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={st.field}>
                    <label style={st.label}>Даты проведения (диапазоны)</label>
                    {lessonForm.dateRanges.map((range, idx) => (
                      <div key={idx} style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'8px', flexWrap:'wrap' }}>
                        <label style={{...st.label, marginRight:0}}>с</label>
                        <input
                          type="date"
                          value={range.start}
                          onChange={e => setDateRange(idx, 'start', e.target.value)}
                          style={{...st.inp, flex:1, minWidth:0}}
                          required
                        />
                        <label style={{...st.label, marginRight:0}}>по</label>
                        <input
                          type="date"
                          value={range.end}
                          onChange={e => setDateRange(idx, 'end', e.target.value)}
                          style={{...st.inp, flex:1, minWidth:0}}
                          required
                        />
                        <button type="button" onClick={() => removeDateRange(idx)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:'0 10px' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDateRange}
                      style={{ ...st.addBtn, background:'#e2e8f0', color:'#1e293b', marginTop:'8px' }}>
                      + Добавить диапазон
                    </button>
                  </div>

                  <button style={st.submitBtn}>{editingLesson ? 'Сохранить изменения' : 'Опубликовать'}</button>
                  {editingLesson && (
                    <button type="button" onClick={() => { setEditingLesson(null); setView('view'); }}
                      style={{...st.submitBtn, background: '#94a3b8'}}>Отмена</button>
                  )}
                </form>
              </div>
            </div>
          )}

          {view === 'teachers' && <TeacherList teachers={meta.teachers} departments={meta.departments} refresh={refreshData} apiUrl={API_URL} onDelete={deleteMeta} onUpdate={updateMeta} />}
          {view === 'departments' && <DepartmentsList departments={meta.departments} refresh={refreshData} apiUrl={API_URL} onDelete={deleteMeta} onUpdate={updateMeta} />}
          {view === 'groups' && <GroupsList groups={meta.groups} refresh={refreshData} apiUrl={API_URL} onDelete={deleteMeta} onUpdate={updateMeta} />}
          {view === 'rooms' && <RoomsList rooms={meta.rooms} refresh={refreshData} apiUrl={API_URL} onDelete={deleteMeta} onUpdate={updateMeta} />}
          {view === 'subjects' && <SubjectList subjects={meta.subjects} refresh={refreshData} apiUrl={API_URL} onDelete={deleteMeta} onUpdate={updateMeta} />}

          {view === 'admin' && (
            <AdminPanel
              meta={meta}
              newMeta={newMeta}
              setNewMeta={setNewMeta}
              addMeta={addMeta}
            />
          )}
        </main>
      </div>
    </>
  );
};

// ========== КОМПОНЕНТЫ СПРАВОЧНИКОВ ==========
const ListWrapper = ({ title, children, onRefresh }) => (
  <div style={{ maxWidth: '1200px' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' }}>
      <h2 style={{ fontSize:'24px', fontWeight:'800' }}>{title}</h2>
      <button onClick={onRefresh} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', borderRadius:'12px', border:'none', background:'#e2e8f0', color:'#1e293b', fontWeight:'600', cursor:'pointer' }}>
        <RefreshCw size={18} /> Обновить
      </button>
    </div>
    {children}
  </div>
);

const TeacherList = ({ teachers, departments, refresh, apiUrl, onDelete, onUpdate }) => {
  const [form, setForm] = useState({ full_name: '', department_id: '', position: '', email: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', department_id: '', position: '', email: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.full_name) return alert('Введите ФИО');
    try {
      await axios.post(`${apiUrl}/teachers`, { name: form.full_name, department_id: form.department_id || null, position: form.position, email: form.email });
      setForm({ full_name: '', department_id: '', position: '', email: '' });
      refresh();
    } catch { alert('Ошибка добавления'); }
  };

  const startEdit = (teacher) => {
    setEditId(teacher.id);
    setEditForm({
      full_name: teacher.full_name,
      department_id: teacher.department_id || '',
      position: teacher.position || '',
      email: teacher.email || ''
    });
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id) => {
    if (!editForm.full_name) return alert('ФИО обязательно');
    try {
      await onUpdate('teachers', id, {
        full_name: editForm.full_name,
        department_id: editForm.department_id || null,
        position: editForm.position,
        email: editForm.email
      });
      setEditId(null);
      refresh();
    } catch { alert('Ошибка сохранения'); }
  };

  return (
    <ListWrapper title="Преподаватели" onRefresh={refresh}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'25px', marginBottom:'30px' }}>
        <h3>Добавить преподавателя</h3>
        <form onSubmit={handleAdd} style={{ display:'flex', gap:'15px', flexWrap:'wrap', alignItems:'flex-end' }}>
          <input placeholder="ФИО" value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} style={st.inp} required />
          <select value={form.department_id} onChange={e=>setForm({...form, department_id:e.target.value})} style={st.inp}>
            <option value="">Кафедра</option>
            {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input placeholder="Должность" value={form.position} onChange={e=>setForm({...form, position:e.target.value})} style={st.inp} />
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} style={st.inp} />
          <button type="submit" style={st.addBtn}><Plus size={18}/> Добавить</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:'20px' }}>
        {teachers.map(t=>(
          <div key={t.id} style={{...st.card, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            {editId === t.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input value={editForm.full_name} onChange={e=>setEditForm({...editForm, full_name:e.target.value})} style={st.inp} placeholder="ФИО" />
                <select value={editForm.department_id} onChange={e=>setEditForm({...editForm, department_id:e.target.value})} style={st.inp}>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input value={editForm.position} onChange={e=>setEditForm({...editForm, position:e.target.value})} style={st.inp} placeholder="Должность" />
                <input value={editForm.email} onChange={e=>setEditForm({...editForm, email:e.target.value})} style={st.inp} placeholder="Email" />
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => saveEdit(t.id)} style={st.addBtn}>Сохранить</button>
                  <button onClick={cancelEdit} style={{...st.addBtn, background:'#94a3b8'}}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:17 }}>{t.full_name}</div>
                    {t.department_name && <div style={st.detail}>Кафедра: {t.department_name}</div>}
                    {t.position && <div style={st.detail}>Должность: {t.position}</div>}
                    {t.email && <div style={st.detail}>Email: {t.email}</div>}
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => startEdit(t)} style={{...st.iconBtn, background:'none'}}><Edit size={14}/></button>
                    <button onClick={() => onDelete('teachers', t.id)} style={{...st.iconBtn, background:'none'}}><Trash2 size={14} color="#ef4444"/></button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </ListWrapper>
  );
};

const DepartmentsList = ({ departments, refresh, apiUrl, onDelete, onUpdate }) => {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      await axios.post(`${apiUrl}/departments`, { name });
      setName('');
      refresh();
    } catch { alert('Ошибка добавления'); }
  };

  const startEdit = (dept) => {
    setEditId(dept.id);
    setEditName(dept.name);
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id) => {
    if (!editName) return alert('Введите название');
    try {
      await onUpdate('departments', id, { name: editName });
      setEditId(null);
      refresh();
    } catch { alert('Ошибка сохранения'); }
  };

  return (
    <ListWrapper title="Кафедры" onRefresh={refresh}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'25px', marginBottom:'30px' }}>
        <h3>Добавить кафедру</h3>
        <form onSubmit={add} style={{ display:'flex', gap:'15px', alignItems:'flex-end' }}>
          <input placeholder="Название кафедры" value={name} onChange={e=>setName(e.target.value)} style={st.inp} required />
          <button type="submit" style={st.addBtn}><Plus size={18}/> Добавить</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'20px' }}>
        {departments.map(d=>(
          <div key={d.id} style={{...st.card, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            {editId === d.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input value={editName} onChange={e=>setEditName(e.target.value)} style={st.inp} placeholder="Название" />
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => saveEdit(d.id)} style={st.addBtn}>Сохранить</button>
                  <button onClick={cancelEdit} style={{...st.addBtn, background:'#94a3b8'}}>Отмена</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700 }}>{d.name}</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => startEdit(d)} style={{...st.iconBtn, background:'none'}}><Edit size={14}/></button>
                  <button onClick={() => onDelete('departments', d.id)} style={{...st.iconBtn, background:'none'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ListWrapper>
  );
};

const GroupsList = ({ groups, refresh, apiUrl, onDelete, onUpdate }) => {
  const [form, setForm] = useState({ group_name: '', course: 1 });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ group_name: '', course: '' });

  const add = async (e) => {
    e.preventDefault();
    if (!form.group_name) return;
    try {
      await axios.post(`${apiUrl}/groups`, { name: form.group_name, course: Number(form.course) });
      setForm({ group_name: '', course: 1 });
      refresh();
    } catch { alert('Ошибка добавления'); }
  };

  const startEdit = (group) => {
    setEditId(group.id);
    setEditForm({ group_name: group.name, course: String(group.course) });
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id) => {
    if (!editForm.group_name) return alert('Введите название группы');
    try {
      await onUpdate('groups', id, { name: editForm.group_name, course: Number(editForm.course) });
      setEditId(null);
      refresh();
    } catch { alert('Ошибка сохранения'); }
  };

  return (
    <ListWrapper title="Группы" onRefresh={refresh}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'25px', marginBottom:'30px' }}>
        <h3>Добавить группу</h3>
        <form onSubmit={add} style={{ display:'flex', gap:'15px', flexWrap:'wrap', alignItems:'flex-end' }}>
          <input placeholder="Название группы (напр. 22ИСП4-09)" value={form.group_name} onChange={e=>setForm({...form, group_name:e.target.value})} style={st.inp} required />
          <input type="number" placeholder="Курс" value={form.course} onChange={e=>setForm({...form, course:e.target.value})} style={{...st.inp, width:'100px'}} min="1" />
          <button type="submit" style={st.addBtn}><Plus size={18}/> Добавить</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' }}>
        {groups.map(g=>(
          <div key={g.id} style={{...st.card, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            {editId === g.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input value={editForm.group_name} onChange={e=>setEditForm({...editForm, group_name:e.target.value})} style={st.inp} placeholder="Название" />
                <input type="number" value={editForm.course} onChange={e=>setEditForm({...editForm, course:e.target.value})} style={st.inp} placeholder="Курс" />
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => saveEdit(g.id)} style={st.addBtn}>Сохранить</button>
                  <button onClick={cancelEdit} style={{...st.addBtn, background:'#94a3b8'}}>Отмена</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:17 }}>{g.name}</div>
                  <div style={st.detail}>Курс: {g.course}</div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => startEdit(g)} style={{...st.iconBtn, background:'none'}}><Edit size={14}/></button>
                  <button onClick={() => onDelete('groups', g.id)} style={{...st.iconBtn, background:'none'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ListWrapper>
  );
};

const RoomsList = ({ rooms, refresh, apiUrl, onDelete, onUpdate }) => {
  const [form, setForm] = useState({ number: '', capacity: 0 });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ number: '', capacity: '' });

  const add = async (e) => {
    e.preventDefault();
    if (!form.number) return;
    try {
      await axios.post(`${apiUrl}/rooms`, { name: form.number, capacity: Number(form.capacity) });
      setForm({ number: '', capacity: 0 });
      refresh();
    } catch { alert('Ошибка добавления'); }
  };

  const startEdit = (room) => {
    setEditId(room.id);
    setEditForm({ number: room.name, capacity: String(room.capacity) });
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id) => {
    if (!editForm.number) return alert('Введите номер аудитории');
    try {
      await onUpdate('rooms', id, { name: editForm.number, capacity: Number(editForm.capacity) });
      setEditId(null);
      refresh();
    } catch { alert('Ошибка сохранения'); }
  };

  return (
    <ListWrapper title="Аудитории" onRefresh={refresh}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'25px', marginBottom:'30px' }}>
        <h3>Добавить аудиторию</h3>
        <form onSubmit={add} style={{ display:'flex', gap:'15px', flexWrap:'wrap', alignItems:'flex-end' }}>
          <input placeholder="Номер аудитории" value={form.number} onChange={e=>setForm({...form, number:e.target.value})} style={st.inp} required />
          <input type="number" placeholder="Вместимость" value={form.capacity} onChange={e=>setForm({...form, capacity:e.target.value})} style={{...st.inp, width:'120px'}} />
          <button type="submit" style={st.addBtn}><Plus size={18}/> Добавить</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' }}>
        {rooms.map(r=>(
          <div key={r.id} style={{...st.card, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            {editId === r.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input value={editForm.number} onChange={e=>setEditForm({...editForm, number:e.target.value})} style={st.inp} placeholder="Номер" />
                <input type="number" value={editForm.capacity} onChange={e=>setEditForm({...editForm, capacity:e.target.value})} style={st.inp} placeholder="Вместимость" />
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => saveEdit(r.id)} style={st.addBtn}>Сохранить</button>
                  <button onClick={cancelEdit} style={{...st.addBtn, background:'#94a3b8'}}>Отмена</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:17 }}>{r.name}</div>
                  <div style={st.detail}>Вместимость: {r.capacity}</div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => startEdit(r)} style={{...st.iconBtn, background:'none'}}><Edit size={14}/></button>
                  <button onClick={() => onDelete('rooms', r.id)} style={{...st.iconBtn, background:'none'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ListWrapper>
  );
};

const SubjectList = ({ subjects, refresh, apiUrl, onDelete, onUpdate }) => {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      await axios.post(`${apiUrl}/subjects`, { name });
      setName('');
      refresh();
    } catch { alert('Ошибка добавления'); }
  };

  const startEdit = (subj) => {
    setEditId(subj.id);
    setEditName(subj.name);
  };

  const cancelEdit = () => setEditId(null);

  const saveEdit = async (id) => {
    if (!editName) return alert('Введите название дисциплины');
    try {
      await onUpdate('subjects', id, { name: editName });
      setEditId(null);
      refresh();
    } catch { alert('Ошибка сохранения'); }
  };

  return (
    <ListWrapper title="Дисциплины" onRefresh={refresh}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'25px', marginBottom:'30px' }}>
        <h3>Добавить дисциплину</h3>
        <form onSubmit={add} style={{ display:'flex', gap:'15px', alignItems:'flex-end' }}>
          <input placeholder="Название дисциплины" value={name} onChange={e=>setName(e.target.value)} style={st.inp} required />
          <button type="submit" style={st.addBtn}><Plus size={18}/> Добавить</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'20px' }}>
        {subjects.map(s=>(
          <div key={s.id} style={{...st.card, background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            {editId === s.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input value={editName} onChange={e=>setEditName(e.target.value)} style={st.inp} placeholder="Название дисциплины" />
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => saveEdit(s.id)} style={st.addBtn}>Сохранить</button>
                  <button onClick={cancelEdit} style={{...st.addBtn, background:'#94a3b8'}}>Отмена</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700 }}>{s.name}</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => startEdit(s)} style={{...st.iconBtn, background:'none'}}><Edit size={14}/></button>
                  <button onClick={() => onDelete('subjects', s.id)} style={{...st.iconBtn, background:'none'}}><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </ListWrapper>
  );
};

// Админ-панель (только формы добавления)
// Админ-панель (только формы добавления + загрузка базы)
const AdminPanel = ({ meta, newMeta, setNewMeta, addMeta }) => {
  const [uploadingDb, setUploadingDb] = useState(false);

  const handleDbUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDb(true);
    const formData = new FormData();
    formData.append('db_file', file);
    try {
      await axios.post('/admin/upload-db', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': 'Bearer admin-secret-upload'
        }
      });
      alert('База загружена! Перезагрузите сервер на Render (Manual Deploy) чтобы применить.');
    } catch {
      alert('Ошибка загрузки');
    } finally {
      setUploadingDb(false);
    }
  };

  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'25px'}}>
      {['departments', 'teachers', 'groups', 'rooms', 'subjects'].map(type => (
        <div key={type} style={st.adminCard}>
          <h4>{type === 'departments' ? 'Кафедра' : type === 'teachers' ? 'Преподаватель' : type === 'groups' ? 'Группа' : type === 'rooms' ? 'Аудитория' : 'Дисциплина'}</h4>
          {type === 'teachers' && (
            <>
              <input placeholder="ФИО" value={newMeta.teachers} onChange={e=>setNewMeta({...newMeta, teachers:e.target.value})} style={st.adminInp} />
              <select value={newMeta.teacherDepartment || ''} onChange={e=>setNewMeta({...newMeta, teacherDepartment:e.target.value})} style={st.adminInp}>
                <option value="">Кафедра</option>
                {meta.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input placeholder="Должность" value={newMeta.teacherPosition} onChange={e=>setNewMeta({...newMeta, teacherPosition:e.target.value})} style={st.adminInp} />
              <input placeholder="Email" value={newMeta.teacherEmail} onChange={e=>setNewMeta({...newMeta, teacherEmail:e.target.value})} style={st.adminInp} />
              <button onClick={()=>addMeta('teachers', {department_id: newMeta.teacherDepartment, position: newMeta.teacherPosition, email: newMeta.teacherEmail})} style={st.adminAddBtn}><Plus size={18}/></button>
              <div style={{color:'#64748b', fontSize:12, marginTop:10}}>Полный список — в отдельной вкладке</div>
            </>
          )}
          {type === 'rooms' && (
            <>
              <input placeholder="Номер" value={newMeta.rooms} onChange={e=>setNewMeta({...newMeta, rooms:e.target.value})} style={st.adminInp} />
              <input type="number" placeholder="Вместимость" value={newMeta.roomCapacity} onChange={e=>setNewMeta({...newMeta, roomCapacity:e.target.value})} style={st.adminInp} />
              <button onClick={()=>addMeta('rooms', {capacity: newMeta.roomCapacity})} style={st.adminAddBtn}><Plus size={18}/></button>
              <div style={{color:'#64748b', fontSize:12, marginTop:10}}>Полный список — в отдельной вкладке</div>
            </>
          )}
          {type === 'groups' && (
            <>
              <input placeholder="Название группы" value={newMeta.groups} onChange={e=>setNewMeta({...newMeta, groups:e.target.value})} style={st.adminInp} />
              <button onClick={()=>addMeta('groups')} style={st.adminAddBtn}><Plus size={18}/></button>
              <div style={{color:'#64748b', fontSize:12, marginTop:10}}>Полный список — в отдельной вкладке</div>
            </>
          )}
          {type === 'departments' && (
            <>
              <input placeholder="Название кафедры" value={newMeta.departments} onChange={e=>setNewMeta({...newMeta, departments:e.target.value})} style={st.adminInp} />
              <button onClick={()=>addMeta('departments')} style={st.adminAddBtn}><Plus size={18}/></button>
              <div style={{color:'#64748b', fontSize:12, marginTop:10}}>Полный список — в отдельной вкладке</div>
            </>
          )}
          {type === 'subjects' && (
            <>
              <input placeholder="Название дисциплины" value={newMeta.subjects} onChange={e=>setNewMeta({...newMeta, subjects:e.target.value})} style={st.adminInp} />
              <button onClick={()=>addMeta('subjects')} style={st.adminAddBtn}><Plus size={18}/></button>
              <div style={{color:'#64748b', fontSize:12, marginTop:10}}>Полный список — в отдельной вкладке</div>
            </>
          )}
        </div>
      ))}
      {/* Загрузка базы данных с ПК */}
      <div style={{ gridColumn: '1 / -1', marginTop: 20, padding: 15, border: '1px dashed #e2e8f0', borderRadius: 12 }}>
        <label style={{ fontSize: 13, color: '#64748b' }}>Загрузить базу данных с ПК (только admin):</label>
        <input type="file" accept=".db" onChange={handleDbUpload} style={{ marginTop: 8 }} />
        {uploadingDb && <div style={{ marginTop: 8, color: '#6366f1' }}>Загрузка...</div>}
      </div>
    </div>
  );
};

// ========== СТИЛИ ==========
const st = {
  app: { position:'fixed', top:0, left:0, right:0, bottom:0, display:'flex', background:'#f1f5f9', color:'#1e293b', fontFamily:'sans-serif', overflow:'hidden' },
  sidebar: { width:'280px', background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', height:'100%', overflowY:'auto', flexShrink:0 },
  sideBrand: { padding:'30px', display:'flex', alignItems:'center', gap:'12px' },
  brandText: { fontWeight:'800', fontSize:'18px', letterSpacing:'-0.5px' },
  sideNav: { flex:1, padding:'0 15px', display:'flex', flexDirection:'column', gap:'8px' },
  sideBtn: { display:'flex', alignItems:'center', gap:'12px', padding:'12px 15px', borderRadius:'12px', border:'none', background:'transparent', cursor:'pointer', color:'#64748b', fontWeight:'600' },
  sideBtnActive: { display:'flex', alignItems:'center', gap:'12px', padding:'12px 15px', borderRadius:'12px', border:'none', background:'#6366f1', color:'#fff', fontWeight:'600' },
  sideFooter: { padding:'20px', borderTop:'1px solid #f1f5f9' },
  logoutBtn: { width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'12px', borderRadius:'10px', border:'none', background:'#fff1f2', color:'#e11d48', fontWeight:'600', cursor:'pointer' },
  content: { flex:1, padding:'40px', overflowY:'auto', height:'100%' },
  container: {  },
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  pageTitle: { fontSize:'24px', fontWeight:'800' },
  searchBar: { background:'#fff', padding:'8px', borderRadius:'16px', display:'flex', alignItems:'center', gap:'15px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)' },
  searchTypeToggle: { display:'flex', background:'#f8fafc', padding:'4px', borderRadius:'12px' },
  miniTab: { padding:'6px 12px', border:'none', background:'transparent', borderRadius:'8px', fontSize:'12px', cursor:'pointer', color:'#64748b' },
  miniTabActive: { padding:'6px 12px', border:'none', background:'#fff', borderRadius:'8px', fontSize:'12px', fontWeight:'bold', color:'#6366f1', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' },
  inputSearchWrapper: { display:'flex', alignItems:'center', gap:'10px', paddingRight:'15px' },
  ghostInput: { border:'none', outline:'none', fontSize:'14px', width:'200px' },
  daySection: { marginBottom:'40px' },
  dayHeading: { display:'flex', alignItems:'center', fontWeight:'bold', fontSize:'18px', color:'#64748b', marginBottom:'15px' },
  lessonGrid: { display:'flex', flexDirection:'column', gap:'12px' },
  lessonCard: { background:'#fff', borderRadius:'20px', padding:'20px', display:'flex', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.02)' },
  cardTime: { width:'150px', borderRight:'1px solid #f1f5f9', display:'flex', flexDirection:'column', gap:'4px' },
  pairNum: { fontWeight:'800', color:'#1e293b', fontSize:'14px' },
  timeRange: { color:'#94a3b8', fontSize:'12px' },
  cardInfo: { flex:1, padding:'0 25px' },
  lessonSubject: { fontWeight:'700', fontSize:'17px', marginBottom:'5px', display:'flex', alignItems:'center' },
  lessonDetails: { display:'flex', gap:'15px', color:'#64748b', fontSize:'13px' },
  detailItem: { display:'flex', alignItems:'center', gap:'5px' },
  cardMeta: { textAlign:'right', display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' },
  roomBadge: { background:'#f8fafc', padding:'4px 12px', borderRadius:'8px', fontWeight:'bold', fontSize:'13px', display:'flex', alignItems:'center', gap:'5px', border:'1px solid #e2e8f0' },
  weekTagEven: { background: '#e0e7ff', color: '#4338ca', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  weekTagOdd: { background: '#fef3c7', color: '#92400e', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' },
  emptyState: { padding:'20px', textAlign:'center', color:'#94a3b8', background:'#fff', borderRadius:'15px' },
  authWrapper: { height:'100vh', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', margin:0, padding:0 },
  authCard: { background:'#fff', padding:'50px', borderRadius:'32px', width:'400px', maxWidth:'90%', textAlign:'center' },
  authHeader: { marginBottom:'30px' },
  logoBox: { background:'#6366f1', width:'64px', height:'64px', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' },
  authTitle: { fontSize:'28px', fontWeight:'900', letterSpacing:'-1px', marginBottom:'8px' },
  authSub: { color:'#64748b', fontSize:'14px' },
  form: { display:'flex', flexDirection:'column', gap:'15px' },
  input: { padding:'16px', borderRadius:'14px', border:'1px solid #e2e8f0', background:'#f8fafc', outline:'none' },
  primaryBtn: { background:'#6366f1', color:'#fff', padding:'16px', borderRadius:'14px', border:'none', fontWeight:'bold', fontSize:'16px', cursor:'pointer' },
  formContainer: { maxWidth:'700px' },
  formCard: { background:'#fff', padding:'40px', borderRadius:'24px', boxShadow:'0 10px 25px rgba(0,0,0,0.05)' },
  formHeader: { display:'flex', alignItems:'center', gap:'15px', marginBottom:'30px', borderBottom:'1px solid #f1f5f9', paddingBottom:'20px' },
  stack: { display:'flex', flexDirection:'column', gap:'25px' },
  formInput: { padding:'15px', borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'16px', outline:'none', background:'#f8fafc' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  field: { display:'flex', flexDirection:'column', gap:'8px' },
  label: { fontSize:'13px', fontWeight:'bold', color:'#64748b' },
  formSelect: { padding:'15px', borderRadius:'12px', border:'1px solid #e2e8f0', background:'#f8fafc' },
  checkGrid: { display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'8px' },
  multiBtn: { padding:'12px', borderRadius:'10px', border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:'13px' },
  multiBtnActive: { padding:'12px', borderRadius:'10px', border:'none', background:'#6366f1', color:'#fff', fontWeight:'bold' },
  checkboxRow: { display:'flex', alignItems:'center', gap:'10px' },
  submitBtn: { background:'#1e293b', color:'#fff', padding:'20px', borderRadius:'15px', border:'none', fontWeight:'bold', cursor:'pointer' },
  adminCard: { background:'#fff', borderRadius:'20px', padding:'25px' },
  adminInp: { padding:'10px', borderRadius:'10px', border:'1px solid #e2e8f0', width:'100%' },
  adminAddBtn: { background:'#6366f1', color:'#fff', border:'none', padding:'10px', borderRadius:'10px', cursor:'pointer' },
  adminList: { display:'flex', flexDirection:'column', gap:'8px', marginTop:'10px' },
  adminItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 15px', background:'#f8fafc', borderRadius:'10px', fontSize:'14px' },
  inp: { flex: 1, minWidth:'150px', padding:'12px 15px', borderRadius:'12px', border:'1px solid #e2e8f0', background:'#f8fafc' },
  addBtn: { padding:'12px 25px', borderRadius:'12px', border:'none', background:'#6366f1', color:'#fff', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' },
  card: { borderRadius:'16px', padding:'20px', border:'1px solid', display:'flex', flexDirection:'column', gap:'10px' },
  detail: { fontSize:'14px', color:'#475569' },
  toggleBtn: { border:'none', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', fontWeight:'600', fontSize:'13px' },
  iconBtn: { border:'none', cursor:'pointer', color:'#64748b' }
};

export default App;