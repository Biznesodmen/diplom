from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import date
import os

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__, static_folder=os.path.join(basedir, 'frontend', 'dist'), static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'schedule.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

db = SQLAlchemy(app)

# ========== МОДЕЛИ ==========
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

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

    subject = db.relationship('Subject', backref='lessons')
    group = db.relationship('Group', backref='lessons')
    teacher = db.relationship('Teacher', backref='lessons')
    room = db.relationship('Room', backref='lessons')

with app.app_context():
    db.create_all()
    if not User.query.filter_by(login='admin').first():
        db.session.add(User(login='admin', password='1234'))
    if not User.query.filter_by(login='student').first():
        db.session.add(User(login='student', password='1234'))
    db.session.commit()
    print("База данных создана:", os.path.join(basedir, 'schedule.db'))

# ========== ВСПОМОГАТЕЛЬНЫЕ ==========
def schedule_to_dict(s):
    return {
        'id': s.id,
        'subject': s.subject.name,
        'subject_id': s.subject_id,
        'group': s.group.group_name,
        'group_id': s.group_id,
        'teacher': s.teacher.full_name,
        'teacher_id': s.teacher_id,
        'room': s.room.number,
        'room_id': s.room_id,
        'day': s.day,
        'pair': s.pair,
        'date': s.lesson_date.isoformat(),
        'lesson_type': s.lesson_type
    }

def check_conflicts(group_id, teacher_id, room_id, day, pair, lesson_date, exclude_id=None):
    conflicts = []
    dt = lesson_date
    if isinstance(dt, str):
        dt = date.fromisoformat(dt)

    # Проверка аудитории
    conflict_room = Schedule.query.filter(
        Schedule.room_id == room_id,
        Schedule.day == day,
        Schedule.pair == pair,
        Schedule.lesson_date == dt
    )
    if exclude_id:
        conflict_room = conflict_room.filter(Schedule.id != exclude_id)
    if conflict_room.first():
        r = Room.query.get(room_id)
        conflicts.append(f"Аудитория {r.number} уже занята {dt}")

    # Проверка преподавателя
    conflict_teacher = Schedule.query.filter(
        Schedule.teacher_id == teacher_id,
        Schedule.day == day,
        Schedule.pair == pair,
        Schedule.lesson_date == dt
    )
    if exclude_id:
        conflict_teacher = conflict_teacher.filter(Schedule.id != exclude_id)
    if conflict_teacher.first():
        t = Teacher.query.get(teacher_id)
        conflicts.append(f"Преподаватель {t.full_name} уже занят {dt}")

    # Проверка группы
    conflict_group = Schedule.query.filter(
        Schedule.group_id == group_id,
        Schedule.day == day,
        Schedule.pair == pair,
        Schedule.lesson_date == dt
    )
    if exclude_id:
        conflict_group = conflict_group.filter(Schedule.id != exclude_id)
    if conflict_group.first():
        g = Group.query.get(group_id)
        conflicts.append(f"Группа {g.group_name} уже занята {dt}")

    return conflicts

# ========== АВТОРИЗАЦИЯ ==========
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'login' not in data or 'password' not in data:
        return jsonify({'message': 'Нужны логин и пароль'}), 400
    user = User.query.filter_by(login=data['login']).first()
    if not user or user.password != data['password']:
        return jsonify({'message': 'Неверный логин или пароль'}), 401
    role = 'admin' if user.login == 'admin' else 'student'
    return jsonify({'role': role}), 200

# ========== МЕТАДАННЫЕ ==========
@app.route('/api/meta', methods=['GET'])
def get_meta():
    teachers = Teacher.query.all()
    teacher_list = [{
        'id': t.id, 'full_name': t.full_name,
        'department_id': t.department_id,
        'department_name': t.department.name if t.department else '',
        'position': t.position, 'email': t.email
    } for t in teachers]

    departments = Department.query.all()
    department_list = [{'id': d.id, 'name': d.name} for d in departments]

    groups = Group.query.all()
    group_list = [{'id': g.id, 'name': g.group_name, 'course': g.course} for g in groups]

    rooms = Room.query.all()
    room_list = [{'id': r.id, 'name': r.number, 'capacity': r.capacity} for r in rooms]

    subjects = Subject.query.all()
    subject_list = [{'id': s.id, 'name': s.name} for s in subjects]

    return jsonify({
        'groups': group_list,
        'teachers': teacher_list,
        'rooms': room_list,
        'departments': department_list,
        'subjects': subject_list
    })

# ========== РАСПИСАНИЕ ==========
@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    return jsonify([schedule_to_dict(s) for s in Schedule.query.all()])

@app.route('/api/schedule', methods=['POST'])
def add_schedule():
    data = request.get_json()
    group_id = int(data['group_id'])
    teacher_id = int(data['teacher_id'])
    room_id = int(data['room_id'])
    subject_id = int(data['subject_id'])
    day = int(data['day'])
    pair = int(data['pair'])
    lesson_date_str = data['date']
    lesson_date = date.fromisoformat(lesson_date_str)
    lesson_type = data.get('lesson_type', 'lecture')

    conflicts = check_conflicts(group_id, teacher_id, room_id, day, pair, lesson_date)
    if conflicts:
        return jsonify({'conflicts': conflicts}), 409

    new_lesson = Schedule(
        subject_id=subject_id, group_id=group_id, teacher_id=teacher_id,
        room_id=room_id, day=day, pair=pair,
        lesson_date=lesson_date, lesson_type=lesson_type
    )
    db.session.add(new_lesson)
    db.session.commit()
    return jsonify(schedule_to_dict(new_lesson)), 201

@app.route('/api/schedule/<int:id>', methods=['PUT'])
def update_schedule(id):
    lesson = Schedule.query.get_or_404(id)
    data = request.get_json()
    group_id = int(data.get('group_id', lesson.group_id))
    teacher_id = int(data.get('teacher_id', lesson.teacher_id))
    room_id = int(data.get('room_id', lesson.room_id))
    subject_id = int(data.get('subject_id', lesson.subject_id))
    day = int(data.get('day', lesson.day))
    pair = int(data.get('pair', lesson.pair))
    lesson_date_str = data.get('date', lesson.lesson_date.isoformat())
    lesson_date = date.fromisoformat(lesson_date_str)
    lesson_type = data.get('lesson_type', lesson.lesson_type)

    conflicts = check_conflicts(group_id, teacher_id, room_id, day, pair, lesson_date, exclude_id=id)
    if conflicts:
        return jsonify({'conflicts': conflicts}), 409

    lesson.subject_id = subject_id
    lesson.group_id = group_id
    lesson.teacher_id = teacher_id
    lesson.room_id = room_id
    lesson.day = day
    lesson.pair = pair
    lesson.lesson_date = lesson_date
    lesson.lesson_type = lesson_type
    db.session.commit()
    return jsonify(schedule_to_dict(lesson))

@app.route('/api/schedule/<int:id>', methods=['DELETE'])
def delete_schedule(id):
    lesson = Schedule.query.get_or_404(id)
    db.session.delete(lesson)
    db.session.commit()
    return jsonify({'message': 'Занятие удалено'})

# ========== СПРАВОЧНИКИ ==========
@app.route('/api/departments', methods=['POST'])
def add_department():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Название обязательно'}), 400
    if Department.query.filter_by(name=name).first():
        return jsonify({'error': 'Кафедра уже существует'}), 400
    dept = Department(name=name)
    db.session.add(dept)
    db.session.commit()
    return jsonify({'id': dept.id, 'name': dept.name}), 201

@app.route('/api/departments/<int:id>', methods=['PUT'])
def update_department(id):
    dept = Department.query.get_or_404(id)
    data = request.get_json()
    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'Название обязательно'}), 400
    existing = Department.query.filter(Department.name == new_name, Department.id != id).first()
    if existing:
        return jsonify({'error': 'Кафедра с таким названием уже существует'}), 400
    dept.name = new_name
    db.session.commit()
    return jsonify({'id': dept.id, 'name': dept.name}), 200

@app.route('/api/departments/<int:id>', methods=['DELETE'])
def delete_department(id):
    dept = Department.query.get_or_404(id)
    db.session.delete(dept)
    db.session.commit()
    return jsonify({'message': 'Кафедра удалена'})

# Группы
@app.route('/api/groups', methods=['POST'])
def add_group():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Название обязательно'}), 400
    if Group.query.filter_by(group_name=name).first():
        return jsonify({'error': 'Группа уже существует'}), 400
    group = Group(group_name=name, course=data.get('course', 1))
    db.session.add(group)
    db.session.commit()
    return jsonify({'id': group.id, 'name': group.group_name, 'course': group.course}), 201

@app.route('/api/groups/<int:id>', methods=['PUT'])
def update_group(id):
    group = Group.query.get_or_404(id)
    data = request.get_json()
    new_name = data.get('name')
    new_course = data.get('course')
    if new_name:
        existing = Group.query.filter(Group.group_name == new_name, Group.id != id).first()
        if existing:
            return jsonify({'error': 'Группа с таким названием уже существует'}), 400
        group.group_name = new_name
    if new_course is not None:
        group.course = int(new_course)
    db.session.commit()
    return jsonify({'id': group.id, 'name': group.group_name, 'course': group.course}), 200

@app.route('/api/groups/<int:id>', methods=['DELETE'])
def delete_group(id):
    group = Group.query.get_or_404(id)
    db.session.delete(group)
    db.session.commit()
    return jsonify({'message': 'Группа удалена'})

# Преподаватели
@app.route('/api/teachers', methods=['POST'])
def add_teacher():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'ФИО обязательно'}), 400
    teacher = Teacher(
        full_name=name,
        department_id=data.get('department_id'),
        position=data.get('position', ''),
        email=data.get('email', '')
    )
    db.session.add(teacher)
    db.session.commit()
    return jsonify({'id': teacher.id, 'full_name': teacher.full_name,
                    'department_id': teacher.department_id,
                    'position': teacher.position,
                    'email': teacher.email}), 201

@app.route('/api/teachers/<int:id>', methods=['PUT'])
def update_teacher(id):
    teacher = Teacher.query.get_or_404(id)
    data = request.get_json()
    new_name = data.get('full_name') or data.get('name')
    if new_name:
        teacher.full_name = new_name
    teacher.department_id = data.get('department_id', teacher.department_id)
    teacher.position = data.get('position', teacher.position)
    teacher.email = data.get('email', teacher.email)
    db.session.commit()
    return jsonify({
        'id': teacher.id,
        'full_name': teacher.full_name,
        'department_id': teacher.department_id,
        'position': teacher.position,
        'email': teacher.email
    }), 200

@app.route('/api/teachers/<int:id>', methods=['DELETE'])
def delete_teacher(id):
    teacher = Teacher.query.get_or_404(id)
    db.session.delete(teacher)
    db.session.commit()
    return jsonify({'message': 'Преподаватель удалён'})

# Аудитории
@app.route('/api/rooms', methods=['POST'])
def add_room():
    data = request.get_json()
    number = data.get('name')
    if not number:
        return jsonify({'error': 'Номер аудитории обязателен'}), 400
    room = Room(number=number, capacity=data.get('capacity', 0))
    db.session.add(room)
    db.session.commit()
    return jsonify({'id': room.id, 'name': room.number, 'capacity': room.capacity}), 201

@app.route('/api/rooms/<int:id>', methods=['PUT'])
def update_room(id):
    room = Room.query.get_or_404(id)
    data = request.get_json()
    new_number = data.get('name') or data.get('number')
    if new_number:
        existing = Room.query.filter(Room.number == new_number, Room.id != id).first()
        if existing:
            return jsonify({'error': 'Аудитория с таким номером уже существует'}), 400
        room.number = new_number
    if 'capacity' in data:
        room.capacity = int(data['capacity'])
    db.session.commit()
    return jsonify({'id': room.id, 'name': room.number, 'capacity': room.capacity}), 200

@app.route('/api/rooms/<int:id>', methods=['DELETE'])
def delete_room(id):
    room = Room.query.get_or_404(id)
    db.session.delete(room)
    db.session.commit()
    return jsonify({'message': 'Аудитория удалена'})

# Дисциплины
@app.route('/api/subjects', methods=['POST'])
def add_subject():
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Название дисциплины обязательно'}), 400
    if Subject.query.filter_by(name=name).first():
        return jsonify({'error': 'Дисциплина уже существует'}), 400
    subj = Subject(name=name)
    db.session.add(subj)
    db.session.commit()
    return jsonify({'id': subj.id, 'name': subj.name}), 201

@app.route('/api/subjects/<int:id>', methods=['PUT'])
def update_subject(id):
    subj = Subject.query.get_or_404(id)
    data = request.get_json()
    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'Название дисциплины обязательно'}), 400
    existing = Subject.query.filter(Subject.name == new_name, Subject.id != id).first()
    if existing:
        return jsonify({'error': 'Дисциплина с таким названием уже существует'}), 400
    subj.name = new_name
    db.session.commit()
    return jsonify({'id': subj.id, 'name': subj.name}), 200

@app.route('/api/subjects/<int:id>', methods=['DELETE'])
def delete_subject(id):
    subj = Subject.query.get_or_404(id)
    db.session.delete(subj)
    db.session.commit()
    return jsonify({'message': 'Дисциплина удалена'})

# ========== ФРОНТЕНД ==========
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')
import shutil

@app.route('/admin/upload-db', methods=['POST'])
def upload_database():
    # только для админа (проверка по секретному ключу)
    auth_header = request.headers.get('Authorization', '')
    if auth_header != 'Bearer admin-secret-upload':
        return jsonify({'error': 'Unauthorized'}), 401
    file = request.files.get('db_file')
    if not file:
        return jsonify({'error': 'No file'}), 400
    db_path = os.path.join(basedir, 'schedule.db')
    # сохраняем копию текущей базы на всякий случай
    backup_path = db_path + '.backup'
    if os.path.exists(db_path):
        shutil.copy2(db_path, backup_path)
    file.save(db_path)
    return jsonify({'message': 'База загружена, перезагрузите сервер'}), 200

#import requests

#DB_DOWNLOAD_URL = 'https://limewire.com/d/OC5mP#TFp6iojO0a' 

#def update_database():
 #   try:
   #python main.py     resp = requests.get(DB_DOWNLOAD_URL)
  #      if resp.status_code == 200:
  #          with open(os.path.join(basedir, 'schedule.db'), 'wb') as f:
  #              f.write(resp.content)
 #           print('База обновлена из облака')
 #   except Exception as e:
 #       print(f'Ошибка обновления базы: {e}')

#update_database()

if __name__ == '__main__':
    app.run(debug=True, port=5000)