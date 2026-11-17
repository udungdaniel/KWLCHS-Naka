/**
 * Seed script for KWLCHS School Management System
 * Run: bun scripts/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}

const GRADE_BANDS = [
  { min: 70, grade: 'A', point: 5 },
  { min: 60, grade: 'B', point: 4 },
  { min: 50, grade: 'C', point: 3 },
  { min: 45, grade: 'D', point: 2 },
  { min: 40, grade: 'E', point: 1 },
  { min: 0, grade: 'F', point: 0 },
]

function scoreToGrade(total: number) {
  return GRADE_BANDS.find((b) => total >= b.min)!
}

async function main() {
  console.log('Clearing existing data...')
  await db.messageLog.deleteMany()
  await db.announcement.deleteMany()
  await db.bookLoan.deleteMany()
  await db.book.deleteMany()
  await db.timetable.deleteMany()
  await db.result.deleteMany()
  await db.payment.deleteMany()
  await db.feeStructure.deleteMany()
  await db.staffAttendance.deleteMany()
  await db.course.deleteMany()
  await db.application.deleteMany()
  await db.student.deleteMany()
  await db.staff.deleteMany()
  await db.adminUser.deleteMany()
  await db.department.deleteMany()
  await db.setting.deleteMany()

  console.log('Creating settings...')
  await db.setting.create({
    data: {
      id: 'main',
      schoolName: 'Professor Dr. Karl Wilhelm Lauterbach College of Health Sciences and Technology',
      shortName: 'KWLCHS Naka',
      address: 'Naka Headquarter Road, Naka, Gwer West LGA, Benue State, Nigeria',
      phone: '0806 262 7620',
      email: 'info@kwchs-naka.edu.ng',
      motto: 'Training Competent Health Professionals for Nigeria',
      about:
        'Professor Dr. Karl Wilhelm Lauterbach College of Health Sciences and Technology, Naka, Benue State is a tertiary health institution dedicated to training competent, ethical and compassionate health professionals. The College offers National Diploma (ND) and Higher National Diploma (HND) programmes across Community Health, Medical Laboratory Technology, Environmental Health, Health Information Management, Pharmacy Technology and Dental Surgery Technology. Our curriculum combines classroom instruction, laboratory practice and clinical postings so that every graduate is ready to serve communities across Nigeria.',
      currentSession: '2026/2027',
      currentSemester: 1,
      admissionOpen: true,
      whatsappLine: '0806 262 7620',
    },
  })

  console.log('Creating departments...')
  const deptData = [
    { name: 'Community Health', code: 'CHT', description: 'Community Health Extension Workers (CHEW) and Community Health (ND/HND) programmes training frontline primary health care workers.' },
    { name: 'Medical Laboratory Technology', code: 'MLT', description: 'Training laboratory scientists and technicians in diagnostics, haematology, microbiology and chemical pathology.' },
    { name: 'Environmental Health Technology', code: 'EHT', description: 'Environmental health officers trained in sanitation, food safety, vector control and public health inspection.' },
    { name: 'Health Information Management', code: 'HIM', description: 'Health records and information management professionals for hospitals and health data systems.' },
    { name: 'Pharmacy Technology', code: 'PHT', description: 'Pharmacy technicians trained in dispensing, drug management and pharmaceutical care.' },
    { name: 'Dental Surgery Technology', code: 'DST', description: 'Dental surgery technicians trained in oral health care, dental assisting and preventive dentistry.' },
  ]
  const departments: Record<string, { id: string; code: string }> = {}
  for (const d of deptData) {
    const created = await db.department.create({ data: d })
    departments[d.code] = created
  }

  console.log('Creating admin users...')
  await db.adminUser.createMany({
    data: [
      { fullName: 'Dr. Terhemba Shija', email: 'provost@kwchs-naka.edu.ng', role: 'PROVOST', phone: '0803 111 0001', passwordHash: hashPassword('Provost@2025') },
      { fullName: 'Mrs. Grace Ngbede', email: 'registrar@kwchs-naka.edu.ng', role: 'REGISTRAR', phone: '0803 111 0002', passwordHash: hashPassword('Registrar@2025') },
      { fullName: 'Mr. Iorliam Aondona', email: 'bursar@kwchs-naka.edu.ng', role: 'BURSAR', phone: '0803 111 0003', passwordHash: hashPassword('Bursar@2025') },
    ],
  })

  console.log('Creating staff...')
  const staffSeed = [
    { firstName: 'Emmanuel', lastName: 'Adeyemi', gender: 'Male', rank: 'Chief Lecturer', dept: 'MLT', specialty: 'Haematology & Blood Transfusion Science', quals: 'B.Sc MLS, M.Sc Haematology, MLSCN Licensed', salary: 285000 },
    { firstName: 'Fatima', lastName: 'Abdullahi', gender: 'Female', rank: 'Principal Lecturer', dept: 'CHT', specialty: 'Community Health Practice', quals: 'B.Sc Public Health, MPH, CHEW Trainer', salary: 260000 },
    { firstName: 'John', lastName: 'Ogbu', gender: 'Male', rank: 'Senior Lecturer', dept: 'EHT', specialty: 'Water & Sanitation Engineering', quals: 'B.Sc Env. Health, M.Sc Environmental Mgt', salary: 240000 },
    { firstName: 'Patience', lastName: 'Ihuoma', gender: 'Female', rank: 'Lecturer I', dept: 'HIM', specialty: 'Health Records & Informatics', quals: 'B.Sc HIM, PGD Health Informatics', salary: 220000 },
    { firstName: 'Ibrahim', lastName: 'Musah', gender: 'Male', rank: 'Lecturer II', dept: 'PHT', specialty: 'Pharmaceutics & Dispensing', quals: 'B.Pharm, PCN Licensed', salary: 200000 },
    { firstName: 'Ruth', lastName: 'Nguemo', gender: 'Female', rank: 'Lecturer II', dept: 'DST', specialty: 'Oral Health & Preventive Dentistry', quals: 'BDS, Dental Technology Cert.', salary: 198000 },
    { firstName: 'Samuel', lastName: 'Terwase', gender: 'Male', rank: 'Instructor', dept: 'MLT', specialty: 'Medical Microbiology Lab Practice', quals: 'ND MLT, HND MLT, MLSCN Tech.', salary: 165000 },
    { firstName: 'Esther', lastName: 'Ude', gender: 'Female', rank: 'Senior Instructor', dept: 'CHT', specialty: 'Midwifery & Primary Health Care', quals: 'RN, RM, B.Sc Nursing', salary: 180000 },
  ]
  const staff: Record<string, { id: string; firstName: string; lastName: string; staffNo: string }> = {}
  let sIdx = 0
  for (const s of staffSeed) {
    sIdx++
    const created = await db.staff.create({
      data: {
        staffNo: `KWLCHS/STF/2023/${String(sIdx).padStart(3, '0')}`,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        dob: `19${70 + (sIdx % 20)}-0${(sIdx % 9) + 1}-1${sIdx % 9}`,
        email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@kwchs-naka.edu.ng`,
        phone: `0806 110 01${String(sIdx).padStart(2, '0')}`,
        departmentId: departments[s.dept].id,
        specialty: s.specialty,
        qualifications: s.quals,
        rank: s.rank,
        salary: s.salary,
        employmentDate: '2023-01-15',
        status: 'ACTIVE',
      },
    })
    staff[s.lastName] = created
  }

  console.log('Creating courses...')
  const courseSeed: Array<{ code: string; title: string; cu: number; sem: number; level: number; dept: string | null; lecturer?: string }> = [
    { code: 'MLT 101', title: 'Introduction to Medical Laboratory Science', cu: 2, sem: 1, level: 100, dept: 'MLT', lecturer: 'Adeyemi' },
    { code: 'MLT 102', title: 'General Biology for Lab Scientists', cu: 2, sem: 1, level: 100, dept: 'MLT', lecturer: 'Terwase' },
    { code: 'MLT 103', title: 'Basic Chemistry & Biochemistry', cu: 3, sem: 1, level: 100, dept: 'MLT' },
    { code: 'MLT 201', title: 'Haematology I', cu: 3, sem: 1, level: 200, dept: 'MLT', lecturer: 'Adeyemi' },
    { code: 'MLT 202', title: 'Medical Microbiology I', cu: 3, sem: 2, level: 200, dept: 'MLT', lecturer: 'Terwase' },
    { code: 'CHT 101', title: 'Introduction to Community Health', cu: 2, sem: 1, level: 100, dept: 'CHT', lecturer: 'Abdullahi' },
    { code: 'CHT 102', title: 'Primary Health Care & CHEW Practice', cu: 3, sem: 1, level: 100, dept: 'CHT', lecturer: 'Ude' },
    { code: 'CHT 201', title: 'Epidemiology & Disease Control', cu: 3, sem: 1, level: 200, dept: 'CHT', lecturer: 'Abdullahi' },
    { code: 'EHT 101', title: 'Principles of Environmental Health', cu: 2, sem: 1, level: 100, dept: 'EHT', lecturer: 'Ogbu' },
    { code: 'EHT 201', title: 'Water Supply & Waste Management', cu: 3, sem: 2, level: 200, dept: 'EHT', lecturer: 'Ogbu' },
    { code: 'HIM 101', title: 'Introduction to Health Records', cu: 2, sem: 1, level: 100, dept: 'HIM', lecturer: 'Ihuoma' },
    { code: 'HIM 201', title: 'Health Information Systems', cu: 3, sem: 1, level: 200, dept: 'HIM', lecturer: 'Ihuoma' },
    { code: 'PHT 101', title: 'Introduction to Pharmacy Practice', cu: 2, sem: 1, level: 100, dept: 'PHT', lecturer: 'Musah' },
    { code: 'PHT 201', title: 'Pharmaceutics & Dispensing Technique', cu: 3, sem: 2, level: 200, dept: 'PHT', lecturer: 'Musah' },
    { code: 'DST 101', title: 'Introduction to Dental Surgery Technology', cu: 2, sem: 1, level: 100, dept: 'DST', lecturer: 'Nguemo' },
    { code: 'GES 101', title: 'Use of English & Communication Skills', cu: 2, sem: 1, level: 100, dept: null },
    { code: 'GES 102', title: 'Introduction to Computer Science', cu: 2, sem: 2, level: 100, dept: null },
    { code: 'GES 201', title: 'Citizenship Education & Ethics', cu: 2, sem: 1, level: 200, dept: null },
  ]
  const courses: Record<string, { id: string; cu: number }> = {}
  for (const c of courseSeed) {
    const created = await db.course.create({
      data: {
        code: c.code,
        title: c.title,
        creditUnits: c.cu,
        semester: c.sem,
        level: c.level,
        departmentId: c.dept ? departments[c.dept].id : null,
        lecturerId: c.lecturer ? staff[c.lecturer].id : null,
      },
    })
    courses[c.code] = { id: created.id, cu: c.cu }
  }

  console.log('Creating students...')
  const nameSeed = [
    ['Aondoaseer', 'Verlumun', 'Male'], ['Beatrice', 'Ochoga', 'Female'], ['Chinedu', 'Okonkwo', 'Male'],
    ['Dooshima', 'Terver', 'Female'], ['Emeka', 'Nwosu', 'Male'], ['Favour', 'Ade', 'Female'],
    ['Gboyega', 'Olatunde', 'Male'], ['Hauwa', 'Yusuf', 'Female'], ['Iveren', 'Shadrach', 'Female'],
    ['Jide', 'Balogun', 'Male'], ['Kwaghnedo', 'Peter', 'Male'], ['Lami', 'Danjuma', 'Female'],
    ['Mvendaga', 'Daniel', 'Male'], ['Ngozi', 'Eze', 'Female'], ['Ocherije', 'Sunday', 'Male'],
    ['Precious', 'Igwe', 'Female'], ['Seun', 'Adewale', 'Male'], ['Tersoo', 'Agbaji', 'Male'],
    ['Uche', 'Obi', 'Male'], ['Wuese', 'Brandon', 'Female'],
  ]
  const deptKeys = Object.keys(departments)
  let idx = 0
  const students: Array<{ id: string; matricNo: string; dept: string; level: number; firstName: string; lastName: string }> = []
  for (const [first, last, gender] of nameSeed) {
    idx++
    const deptCode = pick(deptKeys, idx)
    const level = pick([100, 200], idx)
    const year = level === 200 ? 2025 : 2026
    const seq = students.filter((s) => s.dept === deptCode).length + 1
    const matricNo = `KWLCHS/${year}/${deptCode}/${String(seq).padStart(3, '0')}`
    const created = await db.student.create({
      data: {
        matricNo,
        firstName: first,
        lastName: last,
        gender,
        dob: `200${1 + (idx % 6)}-0${(idx % 9) + 1}-1${idx % 9}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@student.kwchs-naka.edu.ng`,
        phone: `0810 220 02${String(idx).padStart(2, '0')}`,
        address: 'Naka, Gwer West LGA, Benue State',
        stateOfOrigin: pick(['Benue', 'Kogi', 'Enugu', 'Nasarawa', 'Plateau', 'Anambra'], idx),
        departmentId: departments[deptCode].id,
        level,
        status: 'ACTIVE',
        passwordHash: hashPassword('student123'),
      },
    })
    students.push({ id: created.id, matricNo, dept: deptCode, level, firstName: first, lastName: last })
  }

  console.log('Creating fee structures...')
  const session = '2026/2027'
  for (const dept of Object.values(departments)) {
    for (const level of [100, 200, 300, 400]) {
      const base = level >= 300 ? 52000 : 46500
      for (const [itemName, amount] of [
        ['Tuition Fee', base],
        ['Registration Fee', 5000],
        ['Examination Fee', 4000],
        ['Departmental Dues', 3000],
        ['Medical & Insurance Levy', 2500],
      ] as Array<[string, number]>) {
        await db.feeStructure.create({
          data: { session, departmentId: dept.id, level, itemName, amount },
        })
      }
    }
  }

  console.log('Creating payments...')
  for (let i = 0; i < 12; i++) {
    const s = students[i]
    const total = (s.level >= 300 ? 52000 : 46500) + 5000 + 4000 + 3000 + 2500
    const amount = i % 3 === 0 ? total : i % 3 === 1 ? Math.round(total * 0.6) : Math.round(total * 0.35)
    await db.payment.create({
      data: {
        studentId: s.id,
        session,
        amount,
        method: pick(['CASH', 'TRANSFER', 'POS'], i),
        reference: `PAY-${session.replace('/', '')}-${String(i + 1).padStart(4, '0')}`,
        note: i % 3 === 0 ? 'Full session payment' : 'Part payment',
        recordedById: (await db.adminUser.findFirst({ where: { role: 'BURSAR' } }))!.id,
      },
    })
  }

  console.log('Creating results...')
  const prevSession = '2025/2026'
  for (const s of students.filter((x) => x.level === 200)) {
    const courseCodes = Object.keys(courses).filter((code) => {
      const c = courseSeed.find((cs) => cs.code === code)!
      return c.level === 100 && (c.dept === s.dept || c.dept === null) && c.sem === 1
    })
    for (const code of courseCodes) {
      const ca = 15 + Math.floor(Math.random() * 25)
      const exam = 25 + Math.floor(Math.random() * 36)
      const total = Math.min(100, ca + exam)
      const g = scoreToGrade(total)
      await db.result.create({
        data: {
          studentId: s.id,
          courseId: courses[code].id,
          session: prevSession,
          semester: 1,
          caScore: ca,
          examScore: exam,
          total,
          grade: g.grade,
          gradePoint: g.point,
        },
      })
    }
  }
  for (const s of students.filter((x) => x.level === 100).slice(0, 6)) {
    const courseCodes = Object.keys(courses).filter((code) => {
      const c = courseSeed.find((cs) => cs.code === code)!
      return c.level === 100 && (c.dept === s.dept || c.dept === null) && c.sem === 1
    })
    for (const code of courseCodes) {
      const ca = 18 + Math.floor(Math.random() * 22)
      const exam = 20 + Math.floor(Math.random() * 38)
      const total = Math.min(100, ca + exam)
      const g = scoreToGrade(total)
      await db.result.create({
        data: {
          studentId: s.id,
          courseId: courses[code].id,
          session,
          semester: 1,
          caScore: ca,
          examScore: exam,
          total,
          grade: g.grade,
          gradePoint: g.point,
        },
      })
    }
  }

  console.log('Creating timetable...')
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  const slots = [['08:00', '10:00'], ['10:00', '12:00'], ['12:00', '14:00'], ['14:00', '16:00']]
  for (const dept of Object.values(departments)) {
    const deptCourses = courseSeed.filter((c) => c.dept === dept.code && c.sem === 1)
    const general = courseSeed.filter((c) => c.dept === null && c.sem === 1)
    const all = [...deptCourses, ...general]
    for (const level of [100, 200]) {
      const levelCourses = all.filter((c) => c.level === level)
      let slotIdx = 0
      for (const c of levelCourses.slice(0, 4)) {
        const day = days[slotIdx % 5]
        const slot = slots[slotIdx % 4]
        const exists = await db.timetable.findUnique({
          where: { session_semester_departmentId_level_day_startTime: { session, semester: 1, departmentId: dept.id, level, day, startTime: slot[0] } },
        })
        if (!exists) {
          await db.timetable.create({
            data: {
              session,
              semester: 1,
              departmentId: dept.id,
              level,
              day,
              startTime: slot[0],
              endTime: slot[1],
              courseId: courses[c.code].id,
              lecturerId: c.lecturer ? staff[c.lecturer].id : null,
              room: `Room ${1 + (slotIdx % 6)}${c.dept ? ' – ' + c.dept + ' Block' : ' – Admin Block'}`,
            },
          })
        }
        slotIdx++
      }
    }
  }

  console.log('Creating staff attendance (last 5 days)...')
  const today = new Date()
  for (let d = 0; d < 5; d++) {
    const day = new Date(today)
    day.setDate(day.getDate() - d)
    const dateStr = day.toISOString().slice(0, 10)
    for (const s of Object.values(staff)) {
      const status = d === 0 ? pick(['PRESENT', 'PRESENT', 'PRESENT', 'LATE'], d + s.id.length) : pick(['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE', 'LEAVE'], d + s.id.length + d * 3)
      const exists = await db.staffAttendance.findUnique({ where: { staffId_date: { staffId: s.id, date: dateStr } } })
      if (!exists) {
        await db.staffAttendance.create({ data: { staffId: s.id, date: dateStr, status } })
      }
    }
  }

  console.log('Creating library books and loans...')
  const bookSeed = [
    ['Community Health Practice for CHEWs', 'Federal Ministry of Health', 'Community Health', 8],
    ["Muir's Textbook of Pathology", 'John R. Anderson', 'Medical Laboratory', 4],
    ['Dacie & Lewis Practical Haematology', 'Barbara J. Bain', 'Medical Laboratory', 3],
    ['Essentials of Environmental Health', 'Robert H. Friis', 'Environmental Health', 6],
    ['Health Information Management: Theory & Practice', 'Kathleen A. Frawley', 'Health Information', 5],
    ['Remington: The Science of Pharmacy Practice', 'Joseph P. Remington', 'Pharmacy', 4],
    ['Textbook of Dental Anatomy & Oral Physiology', 'Jose F. dos Santos', 'Dental Surgery', 3],
    ['Oxford Handbook of Tropical Medicine', 'Michael Eddleston', 'General Medicine', 6],
    ['Epidemiology & Disease Control in Nigeria', 'A.B. Oguntade', 'Public Health', 5],
    ['Medical Laboratory Science: Theory & Practice', 'Ochei & Kolhatkar', 'Medical Laboratory', 4],
    ['Introduction to Health Statistics', 'A.O. Adejumo', 'Health Information', 4],
    ['Primary Health Care in Developing Countries', 'O.A. Akinyede', 'Community Health', 6],
  ]
  const books: Array<{ id: string; title: string }> = []
  for (const [title, author, category, copies] of bookSeed as Array<[string, string, string, number]>) {
    const created = await db.book.create({
      data: {
        title,
        author,
        category,
        copiesTotal: copies,
        copiesAvailable: copies,
        isbn: `978-9${Math.floor(100000000 + Math.random() * 899999999)}`,
        shelfLocation: `${category.slice(0, 2).toUpperCase()}-${Math.floor(1 + Math.random() * 9)}`,
      },
    })
    books.push({ id: created.id, title })
  }
  await db.bookLoan.create({
    data: {
      bookId: books[0].id,
      borrowerType: 'STUDENT',
      borrowerRef: students[0].matricNo,
      borrowerName: `${students[0].firstName} ${students[0].lastName}`,
      studentId: students[0].id,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    },
  })
  await db.book.update({ where: { id: books[0].id }, data: { copiesAvailable: { decrement: 1 } } })
  await db.bookLoan.create({
    data: {
      bookId: books[3].id,
      borrowerType: 'STAFF',
      borrowerRef: staff['Ogbu'].staffNo,
      borrowerName: `${staff['Ogbu'].firstName} ${staff['Ogbu'].lastName}`,
      dueDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    },
  })
  await db.book.update({ where: { id: books[3].id }, data: { copiesAvailable: { decrement: 1 } } })

  console.log('Creating announcements...')
  await db.announcement.createMany({
    data: [
      { title: 'Resumption Notice — First Semester 2026/2027', body: 'All returning students are expected to resume on Monday, 23 November 2026. Registration and course enrolment close two weeks after resumption. Come along with your school fees receipt for clearance.', audience: 'BOTH' },
      { title: 'Fee Payment Deadline', body: 'Students yet to complete payment of tuition and departmental dues should do so on or before 12 December 2026 at the Bursary. Defaulters will not be allowed to write the first semester examinations.', audience: 'STUDENTS' },
      { title: 'Staff Development Workshop', body: 'All academic staff will attend a two-day workshop on outcome-based teaching and continuous assessment on 4–5 December 2026 in the College Conference Hall. Attendance is compulsory.', audience: 'STAFF' },
      { title: '2026/2027 Admission Applications Open', body: 'Applications are invited from suitably qualified candidates for admission into ND programmes of the College for the 2026/2027 academic session. Apply online through the College portal.', audience: 'BOTH' },
    ],
  })

  console.log('Creating sample admission applications...')
  await db.application.createMany({
    data: [
      {
        applicationNo: 'KWLCHS/APP/2025/0001',
        firstName: 'Chidinma', lastName: 'Okafor', gender: 'Female', dob: '2007-03-14',
        email: 'chidinma.okafor@gmail.com', phone: '0813 456 7890', address: 'Makurdi, Benue State',
        stateOfOrigin: 'Anambra', departmentId: departments.MLT.id,
        examType: 'WAEC', examYear: '2024', examNo: 'WA425/2024/098',
        subjects: JSON.stringify([
          { subject: 'English Language', grade: 'B3' }, { subject: 'Mathematics', grade: 'B2' },
          { subject: 'Biology', grade: 'A1' }, { subject: 'Chemistry', grade: 'B3' }, { subject: 'Physics', grade: 'C4' },
        ]),
        status: 'PENDING',
      },
      {
        applicationNo: 'KWLCHS/APP/2025/0002',
        firstName: 'Musa', lastName: 'Ibrahim', gender: 'Male', dob: '2006-11-02',
        email: 'musa.ibrahim@yahoo.com', phone: '0814 555 2211', address: 'Gboko, Benue State',
        stateOfOrigin: 'Benue', departmentId: departments.CHT.id,
        examType: 'NECO', examYear: '2024', examNo: 'NE789/2024/321',
        subjects: JSON.stringify([
          { subject: 'English Language', grade: 'C5' }, { subject: 'Mathematics', grade: 'C6' },
          { subject: 'Biology', grade: 'B3' }, { subject: 'Agricultural Science', grade: 'B3' },
        ]),
        status: 'PENDING',
      },
      {
        applicationNo: 'KWLCHS/APP/2025/0003',
        firstName: 'Joy', lastName: 'Adamu', gender: 'Female', dob: '2007-06-21',
        email: 'joy.adamu@gmail.com', phone: '0815 777 8899', address: 'Otukpo, Benue State',
        stateOfOrigin: 'Benue', departmentId: departments.HIM.id,
        examType: 'WAEC', examYear: '2025', examNo: 'WA512/2025/014',
        subjects: JSON.stringify([
          { subject: 'English Language', grade: 'B2' }, { subject: 'Mathematics', grade: 'C4' },
          { subject: 'Biology', grade: 'B2' }, { subject: 'Economics', grade: 'C5' }, { subject: 'Data Processing', grade: 'A1' },
        ]),
        status: 'PENDING',
      },
    ],
  })

  console.log('Creating sample message log...')
  const bursar = await db.adminUser.findFirst({ where: { role: 'BURSAR' } })
  await db.messageLog.create({
    data: {
      kind: 'FEE_REMINDER',
      recipientType: 'STUDENT',
      recipientName: `${students[2].firstName} ${students[2].lastName}`,
      destination: '+234810210000',
      subject: 'Fee reminder — N30,250 outstanding',
      body: 'Dear student, this is a reminder that your outstanding fees for 2026/2027 amount to N30,250. Please complete payment at the Bursary. — Bursar, KWLCHS Naka',
      link: 'https://wa.me/234810210000',
      createdById: bursar?.id,
    },
  })

  console.log('Seed complete.')
  console.log('Admin: provost@kwchs-naka.edu.ng / Provost@2025 | registrar@kwchs-naka.edu.ng / Registrar@2025 | bursar@kwchs-naka.edu.ng / Bursar@2025')
  console.log('Student: ' + students[0].matricNo + ' / student123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
