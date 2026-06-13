# fill_pg.py – автономный скрипт для заполнения облачной PostgreSQL
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import date

app = Flask(__name__)
# Подключаемся напрямую к вашей облачной базе
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://diplom_db_233e_user:zd6lRWRKfufdAjkeEw2wOdd78Ur2svr5@dpg-d8ll4958nd3s739thplg-a.frankfurt-postgres.render.com/diplom_db_233e'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Модели (такие же, как в main.py, но объявлены здесь для автономности)
class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)

class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(200), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'))
    position = db.Column(db.String(100))
    email = db.Column(db.String(150))
    department = db.relationship('Department', backref='teachers')

class Group(db.Model):
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    group_name = db.Column(db.String(50), unique=True, nullable=False)
    course = db.Column(db.Integer, default=1)

class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), unique=True, nullable=False)
    capacity = db.Column(db.Integer, default=0)

class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)

class Schedule(db.Model):
    __tablename__ = 'schedule'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    day = db.Column(db.Integer, nullable=False)
    pair = db.Column(db.Integer, nullable=False)
    lesson_date = db.Column(db.Date, nullable=False)
    lesson_type = db.Column(db.String(20), default='lecture')

with app.app_context():
    db.create_all()

    def get_or_create(model, defaults=None, **kwargs):
        instance = db.session.query(model).filter_by(**kwargs).first()
        if instance:
            return instance, False
        params = dict(kwargs)
        if defaults:
            params.update(defaults)
        instance = model(**params)
        db.session.add(instance)
        return instance, True

    # Кафедры
    dept_it, _ = get_or_create(Department, name='Информационные технологии')
    dept_econ, _ = get_or_create(Department, name='Экономики и управления')

    # Преподаватели
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

    # Группы
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

    # Аудитории
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

    # Дисциплины
    subjects_data = [
        dict(name='Разработка программных модулей'),
        dict(name='Проектирование баз данных'),
        dict(name='Физическая культура'),
        dict(name='Иностранный язык'),
        dict(name='Стандартизация и сертификация'),
        dict(name='Информационные технологии'),
        dict(name='Основы алгоритмизации и программирования'),
    ]
    for sd in subjects_data:
        get_or_create(Subject, name=sd['name'])

    db.session.commit()
    print('Справочники готовы.')

    # Расписание (пример на одну неделю)
    from datetime import date, timedelta

# Шаблоны расписания: для каждой группы список (предмет, преподаватель, кабинет, пары, тип_занятия)
schedule_templates = {
    '22ИСПп4-о9': [
        ('Разработка программных модулей', 'Мотолянец А.Н.', '315', [1, 2], 'practice'),
        ('Проектирование баз данных', 'Мартин А.Э.', '422', [3, 4], 'lecture'),
        ('Физическая культура', 'Глинчиков К.Е.', '7', [5], 'practice'),
    ],
    '23ИСПп3-о8': [
        ('Проектирование баз данных', 'Мартин А.Э.', '422', [1, 2], 'lab'),
        ('Информационные технологии', 'Дроздова Е.В.', '47', [3, 4], 'practice'),
        ('Иностранный язык (английский)', 'Колотеев Э.Е.', '9', [5], 'lecture'),
    ],
    '24ИСПп2-о7': [
        ('Основы алгоритмизации и программирования', 'Матухно Е.В.', '15', [1, 2], 'practice'),
        ('Физическая культура', 'Глинчиков К.Е.', '7', [3], 'practice'),
        ('Стандартизация, сертификация и метрология', 'Ткаченко С.В.', '23', [4, 5], 'lecture'),
    ],
    '21ИСПп1-о6': [
        ('Разработка программных модулей', 'Кубрин Э.В.', '7', [1, 2], 'lab'),
        ('Иностранный язык (английский)', 'Колотеев Э.Е.', '9', [3], 'lecture'),
        ('Проектирование баз данных', 'Мартин А.Э.', '422', [4, 5], 'lab'),
    ],
    '22ИСПп5-о10': [
        ('Стандартизация, сертификация и метрология', 'Ткаченко С.В.', '23', [1, 2], 'lecture'),
        ('Разработка программных модулей', 'Мотолянец А.Н.', '315', [3, 4], 'practice'),
        ('Информационные технологии', 'Дроздова Е.В.', '47', [5], 'practice'),
    ],
    '23ИСПп6-о11': [
        ('Информационные технологии', 'Дроздова Е.В.', '47', [1, 2], 'practice'),
        ('Основы алгоритмизации и программирования', 'Матухно Е.В.', '15', [3, 4], 'practice'),
        ('Физическая культура', 'Глинчиков К.Е.', '7', [5], 'practice'),
    ],
}

# Генерация списка занятий на май 2026
lessons_to_add = []
start_date = date(2026, 5, 1)
end_date = date(2026, 5, 31)
current = start_date
while current <= end_date:
    if current.weekday() < 5:          # только будние дни
        day_num = current.isoweekday() # 1 = пн, 5 = пт
        for group_name, entries in schedule_templates.items():
            for subject, teacher, room, pairs, ltype in entries:
                for p in pairs:
                    lessons_to_add.append({
                        'subject': subject,
                        'group': group_name,
                        'teacher': teacher,
                        'room': room,
                        'day': day_num,
                        'pair': p,
                        'lesson_date': current,
                        'lesson_type': ltype
                    })
    current += timedelta(days=1)

    added_count = 0
    for les in lessons_to_add:
        subject_obj = db.session.query(Subject).filter_by(name=les['subject']).first()
        group_obj = db.session.query(Group).filter_by(group_name=les['group']).first()
        teacher_obj = db.session.query(Teacher).filter_by(full_name=les['teacher']).first()
        room_obj = db.session.query(Room).filter_by(number=les['room']).first()
        if not (subject_obj and group_obj and teacher_obj and room_obj):
            continue
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