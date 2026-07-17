import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/vi';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import updateLocale from "dayjs/plugin/updateLocale";
import isoWeek from "dayjs/plugin/isoWeek";
import WeekOfYear from "dayjs/plugin/weekOfYear";

dayjs.extend( utc );
dayjs.extend( timezone );
// dayjs.extend( relativeTime );
// dayjs.extend( localizedFormat );

dayjs.extend( updateLocale );
dayjs.extend( isoWeek );
dayjs.extend( WeekOfYear );
dayjs.extend( customParseFormat );

// Đặt ngày bắt đầu tuần là thứ Hai (Monday)
dayjs.updateLocale( 'en' , {
	weekStart : 1  // 1 = Monday
} );

// Thiết lập múi giờ mặc định cho toàn app
dayjs.tz.setDefault( 'Asia/Ho_Chi_Minh' );

export default dayjs;