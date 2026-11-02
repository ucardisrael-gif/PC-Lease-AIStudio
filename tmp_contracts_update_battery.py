from pathlib import Path
from docx import Document

root = Path('contracts_for_legal_review')
for kind in ('rental', 'leasing'):
    doc = Document(root / f'computer_{kind}_he_service_update.docx')
    seen = set()
    for paragraph in doc.paragraphs:
        text = paragraph.text
        if text.startswith('השירות הכלול, ללא תשלום נוסף'):
            new = ('השירות הכלול, ללא תשלום נוסף, כולל אבחון ותיקון של תקלות חומרה רגילות שהתגלו בשימוש תקין; טיפול במטען תקול שנמסר עם הציוד; תמיכה טלפונית או מרחוק; ושחזור מערכת ההפעלה שהותקנה בידי החברה. '
                   'החברה תחליף את סוללת המחשב הנייד ללא תשלום אם בבדיקה אמינה קיבולת הטעינה המלאה שלה נמוכה מ־70 אחוזים מקיבולת התכנון המקורית של הסוללה. '
                   'היחס מחושב כקיבולת הטעינה המלאה חלקי קיבולת התכנון המקורית, כפול מאה; מדובר במצב הסוללה ולא באחוז הטעינה הנוכחי. '
                   'גם מעל הסף החברה תבדוק סוללה שאינה נטענת או גורמת לכיבוי בלתי צפוי בשימוש תקין ותטפל בתקלה בהתאם להסכם ולדין. '
                   'אם קיים חשד להתנפחות או לפגם בטיחותי, יש להפסיק את השימוש ולפנות לתמיכה. אם לא מתקבלת מדידה אמינה תבוצע בדיקה נוספת; לא תידחה הפנייה אוטומטית בשל היעדר נתון. זכויות הלקוח לפי דין נשמרות.')
            paragraph.runs[0].text = new
            for run in paragraph.runs[1:]: run.text = ''
            seen.add('battery')
        if kind == 'rental' and 'קריטריון מצב הסוללה __________' in text:
            paragraph.runs[0].text = text.replace('קריטריון מצב הסוללה __________', 'קריטריון הסוללה: פחות מ־70 אחוזים מקיבולת התכנון המקורית, לפי סעיף השירות')
            for run in paragraph.runs[1:]: run.text = ''
            seen.add('appendix')
    expected = {'battery', 'appendix'} if kind == 'rental' else {'battery'}
    if seen != expected:
        raise RuntimeError(f'{kind}: expected {expected}; got {seen}')
    doc.save(root / f'computer_{kind}_he_battery_70.docx')
