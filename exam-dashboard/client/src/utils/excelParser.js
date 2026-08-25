import * as XLSX from 'xlsx'

const KNOWN_DEPTS = ["AIDS", "AIML", "CCE", "CSBS", "CYSE", "ECE", "EEE", "CSE", "IT", "MECH"]

const REG_DEPT_MAP = {
  '104': 'CSE',
  '105': 'EEE',
  '106': 'ECE',
  '114': 'MECH',
  '134': 'CCE',
  '148': 'AIML',
  '149': 'CYSE',
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
  if (['CYS', 'CYSE', 'CYBER', 'CYBER SECURITY', 'CSE CYBER SECURITY', 'CYBERSECURITY'].includes(clean)) return 'CYSE'
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

export function extractSemFromCourseCode(courseCode, fallbackSem = 1) {
  if (!courseCode) return fallbackSem
  const code = String(courseCode).toUpperCase().trim()

  if (['U23MA209', 'U23MA210', 'U23MA282', 'U23OME04', 'U23OME06', 'U23OCS86'].includes(code)) return 4
  if (['U23MA204', 'U23OAD81'].includes(code)) return 3

  const codeNoReg = code.replace(/^(U23|U22|U24|19|20|21|22|23)/, '')

  // 1. U23 / U22 / U24 Regulation (e.g. U23CS301 -> 3, U23EC402 -> 4)
  const uMatch = code.match(/^U\d{2}[A-Z]{2,4}(\d)/)
  if (uMatch) {
    const sem = parseInt(uMatch[1], 10)
    if (sem >= 1 && sem <= 8) return sem
  }

  // 2. Anna University 2021 Regulation
  const au21Match = code.match(/^[A-Z]{2,4}3([1-8])\d{2}$/)
  if (au21Match) {
    return parseInt(au21Match[1], 10)
  }

  // 3. Match 3-digit subject pattern
  const match = codeNoReg.match(/[A-Z]{2,4}(\d{3})/)
  if (match) {
    const digit3 = match[1]
    const semDigit = parseInt(digit3[0], 10)
    if (semDigit >= 1 && semDigit <= 8) {
      if (code.startsWith('U23MA20') && semDigit === 2) return 2
      return semDigit
    }
  }

  // 4. Open Elective pattern check
  const oeMatch = codeNoReg.match(/[A-Z]{2,4}(\d{2,3})/)
  if (oeMatch) {
    const digits = oeMatch[1]
    if (digits.length === 3 && '12345678'.includes(digits[0])) {
      return parseInt(digits[0], 10)
    } else if (digits.length === 2) {
      const d0 = digits[0]
      if ('345678'.includes(d0)) return parseInt(d0, 10)
      if ('012'.includes(d0)) return (fallbackSem && fallbackSem !== 1) ? fallbackSem : 4
    }
  }

  // 5. Fallback pattern match
  const match2 = code.match(/^[U\d]{0,3}[A-Z]{2,4}(\d)/)
  if (match2) {
    const semDigit = parseInt(match2[1], 10)
    if (semDigit >= 1 && semDigit <= 8) return semDigit
  }
  return fallbackSem || 1
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
        let rowSem = defaultSem

        for (const item of rawClean) {
          if (/^\d$/.test(item) && parseInt(item, 10) >= 1 && parseInt(item, 10) <= 8) {
            rowSem = parseInt(item, 10)
            break
          }
        }

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
          const actualSem = isArrear
            ? (rowSem !== defaultSem ? rowSem : extractSemFromCourseCode(courseCode, rowSem))
            : rowSem
          records.push({
            name: name || `Student ${primaryId}`,
            reg_no: primaryId,
            roll_no: rollNo || primaryId,
            branch: finalDept,
            semester: actualSem,
            year: Math.ceil(actualSem / 2),
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
