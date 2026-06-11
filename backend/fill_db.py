from main import app, db, Teacher, Department, Group, Room, Subject, Schedule
from datetime import date

with app.app_context():
    db.create_all()

    # ----- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ БЕЗОПАСНОГО ДОБАВЛЕНИЯ -----
    def get_or_create(model, defaults=None, **kwargs):
        """Получить существующую запись или создать новую.
        Возвращает (объект, True если создана новая)."""
        instance = db.session.query(model).filter_by(**kwargs).first()
        if instance:
            return instance, False
        params = dict(kwargs)
        if defaults:
            params.update(defaults)
        instance = model(**params)
        db.session.add(instance)
        return instance, True

    # ====== КАФЕДРЫ ======
    dept_it, _ = get_or_create(Department, name='Информационные технологии')
    dept_econ, _ = get_or_create(Department, name='Экономики и управления')

    # ====== ПРЕПОДАВАТЕЛИ (проверка по ФИО) ======
    teachers_data = [
        dict(full_name='Мотолянец А.Н.', department=dept_it, position='Ведущий программист', email='motolyanets@ranepa.ru'),
        dict(full_name='Мартин А.Э.', department=dept_econ, position='Ведущий программист', email='martin@ranepa.ru'),
        dict(full_name='Глинчиков К.Е.', department=dept_it, position='Ведущий программист', email='glinchikov@ranepa.ru'),
        dict(full_name='Колотеев Э.Е.', department=dept_econ, position='Ведущий программист', email='koloteev@ranepa.ru'),
        dict(full_name='Ткаченко С.В.', department=dept_it, position='Доцент', email='tkachenko@ranepa.ru'),
        dict(full_name='Дроздова Е.В.', department=dept_econ, position='Старший преподаватель', email='drozdova@ranepa.ru'),
        dict(full_name='Матухно Е.В.', department=dept_it, position='Доцент', email='matukhno@ranepa.ru'),
        dict(full_name='Кубрин Э.В.', department=dept_econ, position='Старший преподаватель', email='kubrin@ranepa.ru'),
    ]
    for td in teachers_data:
        get_or_create(Teacher, defaults={'department': td['department'], 'position': td['position'], 'email': td['email']}, full_name=td['full_name'])

    # ====== ГРУППЫ (проверка по названию) ======
    groups_data = [
        dict(group_name='22ИСПп4-о9', course=4),
        dict(group_name='23ИСПп3-о8', course=3),
        dict(group_name='24ИСПп2-о7', course=2),
        dict(group_name='21ИСПп1-о6', course=1),
        dict(group_name='22ИСПп5-о10', course=5),
        dict(group_name='23ИСПп6-о11', course=6),
    ]
    for gd in groups_data:
        get_or_create(Group, defaults={'course': gd['course']}, group_name=gd['group_name'])

    # ====== АУДИТОРИИ (проверка по номеру) ======
    rooms_data = [
        dict(number='315', capacity=30),
        dict(number='422', capacity=60),
        dict(number='15', capacity=25),
        dict(number='9', capacity=20),
        dict(number='23', capacity=35),
        dict(number='47', capacity=40),
        dict(number='7', capacity=15),
    ]
    for rd in rooms_data:
        get_or_create(Room, defaults={'capacity': rd['capacity']}, number=rd['number'])

    # ====== ДИСЦИПЛИНЫ (проверка по названию) ======
    subjects_data = [
        dict(name='Разработка программных модулей'),
        dict(name='Проектирование баз данных'),
        dict(name='Физическая культура'),
        dict(name='Иностранный язык (английский)'),
        dict(name='Стандартизация, сертификация и метрология'),
        dict(name='Информационные технологии'),
        dict(name='Основы алгоритмизации и программирования'),
    ]
    for sd in subjects_data:
        get_or_create(Subject, name=sd['name'])

    # Принудительная фиксация всех справочников
    db.session.commit()
    print('Справочники готовы.')

    # ====== РАСПИСАНИЕ (добавляем, если таких записей ещё нет) ======
    # Чтобы не дублировать пары, проверяем по совокупности полей
    lessons_to_add = [
        dict(subject='Разработка программных модулей', group='22ИСПп4-о9', teacher='Мотолянец А.Н.', room='315', day=1, pair=1, lesson_date=date(2026,5,11), lesson_type='practice'),
        dict(subject='Разработка программных модулей', group='22ИСПп4-о9', teacher='Мотолянец А.Н.', room='315', day=1, pair=2, lesson_date=date(2026,5,11), lesson_type='practice'),
        dict(subject='Проектирование баз данных', group='23ИСПп3-о8', teacher='Мартин А.Э.', room='422', day=3, pair=3, lesson_date=date(2026,5,13), lesson_type='lecture'),
        dict(subject='Проектирование баз данных', group='23ИСПп3-о8', teacher='Мартин А.Э.', room='422', day=5, pair=4, lesson_date=date(2026,5,15), lesson_type='lab'),
        # пример с другими преподавателями и аудиториями
        dict(subject='Физическая культура', group='24ИСПп2-о7', teacher='Глинчиков К.Е.', room='7', day=2, pair=5, lesson_date=date(2026,5,12), lesson_type='practice'),
        dict(subject='Иностранный язык (английский)', group='21ИСПп1-о6', teacher='Колотеев Э.Е.', room='9', day=4, pair=6, lesson_date=date(2026,5,14), lesson_type='lecture'),
        dict(subject='Стандартизация, сертификация и метрология', group='22ИСПп5-о10', teacher='Ткаченко С.В.', room='23', day=5, pair=1, lesson_date=date(2026,5,15), lesson_type='lecture'),
        dict(subject='Информационные технологии', group='23ИСПп6-о11', teacher='Дроздова Е.В.', room='47', day=3, pair=2, lesson_date=date(2026,5,13), lesson_type='practice'),
        dict(subject='Основы алгоритмизации и программирования', group='24ИСПп2-о7', teacher='Матухно Е.В.', room='15', day=1, pair=3, lesson_date=date(2026,5,11), lesson_type='practice'),
        dict(subject='Разработка программных модулей', group='21ИСПп1-о6', teacher='Кубрин Э.В.', room='7', day=2, pair=4, lesson_date=date(2026,5,12), lesson_type='lab'),
        # можно добавить ещё – просто копируйте строки и меняйте параметры
    ]

    added_count = 0
    for les in lessons_to_add:
        # Ищем ID связанных записей
        subject_obj = db.session.query(Subject).filter_by(name=les['subject']).first()
        group_obj = db.session.query(Group).filter_by(group_name=les['group']).first()
        teacher_obj = db.session.query(Teacher).filter_by(full_name=les['teacher']).first()
        room_obj = db.session.query(Room).filter_by(number=les['room']).first()
        if not (subject_obj and group_obj and teacher_obj and room_obj):
            print(f'Пропущено (не найдена ссылка): {les["subject"]}, {les["group"]}, {les["teacher"]}, {les["room"]}')
            continue
        # Проверяем, нет ли уже такой пары
        exists = db.session.query(Schedule).filter(
            Schedule.subject_id == subject_obj.id,
            Schedule.group_id == group_obj.id,
            Schedule.teacher_id == teacher_obj.id,
            Schedule.room_id == room_obj.id,
            Schedule.day == les['day'],
            Schedule.pair == les['pair'],
            Schedule.lesson_date == les['lesson_date']
        ).first()
        if not exists:
            new_lesson = Schedule(
                subject_id=subject_obj.id,
                group_id=group_obj.id,
                teacher_id=teacher_obj.id,
                room_id=room_obj.id,
                day=les['day'],
                pair=les['pair'],
                lesson_date=les['lesson_date'],
                lesson_type=les['lesson_type']
            )
            db.session.add(new_lesson)
            added_count += 1

    db.session.commit()
    print(f'Добавлено новых занятий: {added_count}')