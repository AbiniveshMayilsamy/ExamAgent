import * as XLSX from 'xlsx'

const KNOWN_DEPTS = ["AIDS", "AIML", "CCE", "CSBS", "CYS", "ECE", "EEE", "CSE", "IT", "MECH"]

const REG_DEPT_MAP = {
  '104': 'CSE',
  '105': 'EEE',
  '106': 'ECE',
  '114': 'MECH',
  '134': 'CCE',
  '148': 'AIML',
  '149': 'CYS',
  '205': 'IT',
  '243': 'AIDS',
  '244': 'CSBS',
}

const ROLL_NO_PATTERN = /^(26|25|24|23|22|21|20|19)(AD|CS|CC|EC|EE|ME|IT|CB|SY|AM|VL|CY)[A-Z0-9]{2,6}$/i

export function normalizeDept(deptStr) {
  if (!deptStr) return 'UNKNOWN'
  const clean = String(deptStr).trim().toUpperCase().replace(/&/g, '')
  
  if (['AIDS', 'AIDS A', 'AIDS B', 'AI&DS', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', 'ARTIFICIAL INTELLIGENCE AND DATA'].includes(clean)) return 'AIDS'
  if (['AIML', 'AIML A', 'AIML B', 'AI-ML', 'MACHINE LEARNING'].includes(clean)) return 'AIML'
  if (['CSBS', 'BUSINESS SYSTEMS'].includes(clean)) return 'CSBS'
  if (['CYS', 'CYSE', 'CYBER', 'CYBER SECURITY'].includes(clean)) return 'CYS'
  if (['CCE', 'COMPUTER AND COMMUNICATION ENGINEERING'].includes(clean)) return 'CCE'
  if (['CSE', 'CSE A', 'CSE B', 'CSE C', 'COMPUTER SCIENCE'].includes(clean)) return 'CSE'
  if (['ECE', 'ECE A', 'ECE B', 'ECE C', 'ELECTRONICS AND COMMUNICATION ENGINEERING'].includes(clean)) return 'ECE'
  if (['EEE', 'ELECTRICAL AND ELECTRONICS ENGINEERING'].includes(clean)) return 'EEE'
  if (['MECH', 'MECHANICAL ENGINEERING'].includes(clean)) return 'MECH'
  if (['IT', 'INFORMATION TECHNOLOGY'].includes(clean)) return 'IT'
  return clean
}

export function isValidCourseCode(item) {
  if (!item || item.length < 6 || item.length > 10) return false
  const itemUpper = String(item).toUpperCase()
  if (ROLL_NO_PATTERN.test(itemUpper) || itemUpper.startsWith('IC')) return false
  if (/^\d+$/.test(item)) return false
  if (itemUpper.startsWith('U1') || itemUpper.startsWith('U2') || itemUpper.startsWith('U3')) return true
  if (/^(19|20|21|22|23|24|25)[A-Z]{2,4}\d{3}/.test(itemUpper)) return true
  return false
}

export function getDeptFromRegNo(regNo) {
  if (regNo && regNo.length === 12 && /^\d+$/.test(regNo)) {
    const code = regNo.substring(6, 9)
    return REG_DEPT_MAP[code] || null
  }
  return null
}

export function isLateralEntryStudent(rollNo, regNo) {
  const rStr = String(rollNo || '').toUpperCase()
  const pStr = String(regNo || '').toUpperCase()
  if (rStr.startsWith('IC') || rStr.includes('BTECL') || rStr.includes('BEL')) return true
  if (rStr.length >= 5 && rStr[rStr.length - 3] === '3' && /^\d{2}$/.test(rStr.slice(-2))) return true
  if (pStr.length === 12 && /^\d+$/.test(pStr) && pStr[9] === '3') return true
  return false
}

export async function parseExcelFileInBrowser(file, defaultSem = 1, isArrear = false) {
  const records = []
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      const sheetDept = normalizeDept(sheetName)

      rows.forEach(rowCells => {
        if (!rowCells || rowCells.length === 0) return
        const rawClean = rowCells.map(c => String(c).trim()).filter(Boolean)
        if (rawClean.length === 0) return

        if (rawClean.some(x => ['S.No', 'Roll No', 'Register Number', 'Register No', 'Student Name', 'CourseCode', 'Dept'].includes(x))) return
        if (rawClean.some(x => x.includes('Sri Eshwar') || x.includes('Coimbatore'))) return

        let courseCode = null
        let regNo = null
        let rollNo = null
        let dept = null
        let name = null
        const rowSem = defaultSem

        // 1. Reg No (12 digits)
        for (const item of rawClean) {
          if (item.length === 12 && /^\d+$/.test(item)) {
            regNo = item
            break
          }
        }

        // 2. Course Code
        for (const item of rawClean) {
          if (isValidCourseCode(item)) {
            courseCode = item.toUpperCase()
            break
          }
        }

        // 3. Dept
        for (const item of rawClean) {
          const norm = normalizeDept(item)
          if (KNOWN_DEPTS.includes(norm)) {
            dept = norm
            break
          }
        }

        // 4. Roll No
        for (const item of rawClean) {
          if (item !== regNo && item !== courseCode && item !== dept) {
            if (ROLL_NO_PATTERN.test(item) || item.includes('IC') || item.includes('BTec')) {
              rollNo = item
              break
            }
          }
        }

        // Fallback Roll No
        if (!rollNo) {
          for (const item of rawClean) {
            if (item !== regNo && item !== courseCode && item !== dept && !/^\d+$/.test(item)) {
              if (/[A-Za-z]/.test(item) && /\d/.test(item) && item.length >= 4) {
                rollNo = item
                break
              }
            }
          }
        }

        // 5. Name
        for (const item of rawClean) {
          if (item !== regNo && item !== rollNo && item !== courseCode && item !== dept && !/^\d+$/.test(item)) {
            if (/[A-Za-z]/.test(item)) {
              name = item
              break
            }
          }
        }

        const finalDept = getDeptFromRegNo(regNo) || dept || sheetDept || 'GENERAL'
        const primaryId = regNo || rollNo

        if (primaryId && courseCode) {
          records.push({
            name: name || `Student ${primaryId}`,
            reg_no: primaryId,
            roll_no: rollNo || primaryId,
            branch: finalDept,
            semester: rowSem,
            year: Math.ceil(rowSem / 2),
            course_code: courseCode,
            course_name: courseCode,
            credits: 3,
            is_arrear: isArrear
          })
        }
      })
    })
  } catch (err) {
    console.error('Error parsing excel in browser:', err)
  }
  return records
}
