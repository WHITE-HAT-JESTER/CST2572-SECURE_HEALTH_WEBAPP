'use strict';

//---CALENDAR---//

  //--referencing the HTML elements that structure the calendar and storing them as variables to make modification easier

  const monthYear = document.getElementById('month-year');
  const dates = document.getElementById('dates');
  const previous = document.getElementById('prev-month');
  const next = document.getElementById('next-month');

  let currentDate = new Date();

  const updateCalendar = () =>{
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDay = new Date(currentYear, currentMonth, 0);
    const lastDay = new Date (currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();

    const monthYearString = currentDate.toLocaleString ('default', {month: 'long', year:'numeric'});
    
    monthYear.textContent = monthYearString;

    let datesHTML = '';

    for(let i = firstDayIndex; i > 0; i--){
        
    }

  }

//--End of Calendar Feature--//