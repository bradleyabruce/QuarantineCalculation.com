(function($) {
  "use strict"; // Start of use strict

  // Smooth scrolling using jQuery easing
  $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
      if (target.length) {
        $('html, body').animate({
          scrollTop: (target.offset().top - 56)
        }, 1000, "easeInOutExpo");
        return false;
      }
    }
  });

  // Closes responsive menu when a scroll trigger link is clicked
  $('.js-scroll-trigger').click(function() {
    $('.navbar-collapse').collapse('hide');
  });

  // Activate scrollspy to add active class to navbar items on scroll
  $('body').scrollspy({
    target: '#mainNav',
    offset: 56
  });

})(jQuery); // End of use strict

// We need to add event handlers to the button
document.addEventListener("readystatechange", addEventListeners);

function addEventListeners() {
    //Only attempt to add event listeners after the page is fully loaded
    if (document.readyState == "complete") {

        // calculate submit handler
        var addSpotButton = document.getElementById("CalculateBtn");
        addSpotButton.addEventListener("click", CalculateSubmit);
    }
}

//Submit
function CalculateSubmit(e)
{
  var countrySelection = document.getElementById("countrySelection");
  var country = countrySelection.options[countrySelection.selectedIndex].value;

  var dateSelection = document.getElementById("datePicker");
  if(dateSelection.value)
  {
    var dateParts = dateSelection.value.split('-');
    var date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  }
  else
  {
    alert("Please enter a valid date.");
    throw new Error("Invalid Date Entered");
  }

  var enviromentSelection = document.getElementById("enviromentSelection");
  var enviroment = enviromentSelection.options[enviromentSelection.selectedIndex].value;

  Calculate(country, date, enviroment);
}

// Calculate Function
function Calculate(country, date, enviroment)
{
    var dateStarted = date;
    var dateEnded = addDays(date, 30);

    var earlierDateStarted = addDays(date, -15);
    var laterDateStarted = addDays(date, 15);

    var nowEstimateArray = new Array();
    var earlyEstimateArray = new Array();
    var lateEstimateArray = new Array();

  //constants
  const INFECTION_RATE = 3;
  var POPULATION = 0;
  var CONTACTS_PER_DAY = 0;
  const UPPER_CONTAGIOUS_PERIOD = 38;
  const LOWER_CONTAGIOUS_PERIOD = 8;

  switch(enviroment)
  {
      case "Urban":
        CONTACTS_PER_DAY = 30;
        break;

      case "Rural":
        CONTACTS_PER_DAY = 10;
        break;
  }

  switch(country)
  {
    case "UnitedStates":
      POPULATION = 327200000;
      break;
    
    default:
      POPULATION = 0;
  }

  //Direct Infections
  nowEstimateArray = getDirectEstimateDataBetweenTwoDates(dateStarted, dateEnded, CONTACTS_PER_DAY, INFECTION_RATE, UPPER_CONTAGIOUS_PERIOD);
  earlyEstimateArray = getDirectEstimateDataBetweenTwoDates(earlierDateStarted, dateEnded, CONTACTS_PER_DAY, INFECTION_RATE, UPPER_CONTAGIOUS_PERIOD);
  lateEstimateArray = getDirectEstimateDataBetweenTwoDates(laterDateStarted, dateEnded, CONTACTS_PER_DAY, INFECTION_RATE, UPPER_CONTAGIOUS_PERIOD);
  DrawDirectInfectionsGraph(nowEstimateArray, earlyEstimateArray, lateEstimateArray, earlierDateStarted, dateEnded, dateStarted, laterDateStarted);
  FillDirectInfectionsTable(nowEstimateArray);

  //Indirect Infections
  var indirectEndDate = addMonths(dateStarted, 2);
  indirectInfectionsEstimateArray = getIndirectEstimateData(dateStarted, indirectEndDate, CONTACTS_PER_DAY, INFECTION_RATE,UPPER_CONTAGIOUS_PERIOD, LOWER_CONTAGIOUS_PERIOD);
  
  DrawIndirectInfectionsGraph(indirectInfectionsEstimateArray, dateStarted, indirectEndDate);
  DrawIndirectInfectionsPieChart(indirectInfectionsEstimateArray);
  DrawIndirectDeathsPieChart(indirectInfectionsEstimateArray);
  //draw table and get count
  var totalInfectedCount = FillIndirectInfectionsTable(indirectInfectionsEstimateArray);

  //show the graph for the user
  var dataDiv = document.getElementById("Data");
  dataDiv.style = "Display: block;";

  //jump to new data
  var navButton = document.getElementById("dataNav");
  navButton.click();
  
  WriteCongratulationMessage(totalInfectedCount, dateStarted);

}

/************************** Indirect Calculations ****************************/

function DrawIndirectDeathsPieChart(dataArray)
{
  //find container and clear it of any previous graphs
  var divContainer = document.getElementById('indirectInfectionDeathRatioPieGraphDiv');
  divContainer.innerHTML = "";
  //create new canvas to put graph on
  var canvas = document.createElement("canvas");
  divContainer.appendChild(canvas);
  //generate graph on canvas
  var ctx = canvas.getContext('2d');

  var totalInfections = 0;
  var totalDeaths = 0;

  for(i = 0; i < indirectInfectionsEstimateArray.length; i++)
    {
      var dict = indirectInfectionsEstimateArray[i];
      var dailyInfected = dict["infected"];
      var dailyDeaths = dict["dead"];

      totalInfections += dailyInfected;
      totalDeaths += dailyDeaths;
   }

   var data1 = {
    labels: ["Survivor", "Non-Survivor"],
    datasets: [
      {
        data: [totalInfections, totalDeaths],
        backgroundColor: [
          "#D3D3D3",
          "#000000"
        ]
      }
    ]
  };

  var options = {
    responsive: true,
    title: {
      display: true,
      position: "top",
      text: "Surviability of Infected Population",
      fontSize: 18
    },
    legend: {
      display: true,
      position: "bottom",
      labels: {
        fontColor: "#333",
        fontSize: 16
      }
    }
  };

  var chart1 = new Chart(ctx, {
    type: "doughnut",
    data: data1,
    options: options
  });
}

function FillIndirectInfectionsTable(dataArray)
{
    var table = document.getElementById("IndirectInfectionTable");
    var totalInfectedCount = 0;
    var totalGeneralCases = 0;
    var totalSevereCases = 0;
    var totalCriticalCases = 0;
    var totalDeaths = 0;

    //first clear the table
    table.innerHTML = "";

    //add headers back
    var header = table.createTHead();
    var headerRow = header.insertRow(0);
    var headerCellDate = headerRow.insertCell(0);
    headerCellDate.innerHTML = "Date";
    var headerCellCount = headerRow.insertCell(1);
    headerCellCount.innerHTML = "Total Indirect Infections Avoided";
    var headerCellGeneralSeverityCount = headerRow.insertCell(2);
    headerCellGeneralSeverityCount.innerHTML = "Cases with General Symptoms";
    var headerCellSevereSeverityCount = headerRow.insertCell(3);
    headerCellSevereSeverityCount.innerHTML = "Cases with Severe Symptoms";
    var headerCellCriticalSeverityCount = headerRow.insertCell(4);
    headerCellCriticalSeverityCount.innerHTML = "Cases with Critical Symptoms";
    var headerCellDeathCount = headerRow.insertCell(5);
    headerCellDeathCount.innerHTML = "Total Potential Deaths";
    
    for(i = 0; i < dataArray.length; i++)
    {
      var dict = dataArray[i];
      var date = dict["date"];

      var dailyInfected = dict["infected"];
      var dailyGeneralCount = dict["general"];
      var dailySevereCount = dict["severe"];
      var dailyCriticalCount = dict["critical"];
      var dailyDeaths = dict["dead"];

      totalInfectedCount += dailyInfected;
      totalGeneralCases += dailyGeneralCount;
      totalSevereCases += dailySevereCount;
      totalCriticalCases += dailyCriticalCount;
      totalDeaths += dailyDeaths;

      if(i % 14 == 0){
        var row = table.insertRow(-1);
        var dateCell = row.insertCell(0);
        var totalCell = row.insertCell(1);
        var generalCell = row.insertCell(2);
        var severeCell = row.insertCell(3);
        var criticalCell = row.insertCell(4);
        var deathCell = row.insertCell(5);

        dateCell.innerHTML = date.toDateString();
        totalCell.innerHTML = totalInfectedCount;
        generalCell.innerHTML = totalGeneralCases;
        severeCell.innerHTML = totalSevereCases;
        criticalCell.innerHTML = totalCriticalCases;
        deathCell.innerHTML = totalDeaths;
      }
   }

   return totalInfectedCount;
}

function DrawIndirectInfectionsPieChart(indirectInfectionsEstimateArray)
{
  //find container and clear it of any previous graphs
  var divContainer = document.getElementById('indirectInfectionSeverityPieGraphDiv');
  divContainer.innerHTML = "";
  //create new canvas to put graph on
  var canvas = document.createElement("canvas");
  divContainer.appendChild(canvas);
  //generate graph on canvas
  var ctx = canvas.getContext('2d');

  var totalGeneralCases = 0;
  var totalSevereCases = 0;
  var totalCriticalCases = 0;

  for(i = 0; i < indirectInfectionsEstimateArray.length; i++)
    {
      var dict = indirectInfectionsEstimateArray[i];
      var dailyGeneralCount = dict["general"];
      var dailySevereCount = dict["severe"];
      var dailyCriticalCount = dict["critical"];

      totalGeneralCases += dailyGeneralCount;
      totalSevereCases += dailySevereCount;
      totalCriticalCases += dailyCriticalCount;
   }

   var data1 = {
    labels: ["General Infections", "Severe Infections", "Critical Infections"],
    datasets: [
      {
        data: [totalGeneralCases, totalSevereCases, totalCriticalCases],
        backgroundColor: [
          "#077BB3",
          "#FF7A89",
          "#EAE050"
        ]
      }
    ]
  };

  var options = {
    responsive: true,
    title: {
      display: true,
      position: "top",
      text: "Infections by Severity",
      fontSize: 18
    },
    legend: {
      display: true,
      position: "bottom",
      labels: {
        fontColor: "#333",
        fontSize: 16
      }
    }
  };

  var chart1 = new Chart(ctx, {
    type: "doughnut",
    data: data1,
    options: options
  });
}

function DrawIndirectInfectionsGraph(indirectInfectionsEstimateArray, dateStarted, dateEnded)
{
  //find container and clear it of any previous graphs
  var divContainer = document.getElementById('indirectInfectionLineGraphDiv');
  divContainer.innerHTML = "";
  //create new canvas to put graph on
  var canvas = document.createElement("canvas");
  canvas.style = "display: inline-block; width: 500px;";
  divContainer.appendChild(canvas);
  //generate graph on canvas
  var ctx = canvas.getContext('2d');
  var dateArray = GenerateIndirectDateArray(dateStarted, dateEnded);
  var indirectInfectionData = GenerateIndirectInfectionDataFromArray(indirectInfectionsEstimateArray, 'infected');
  var indirectDeathData = GenerateIndirectInfectionDataFromArray(indirectInfectionsEstimateArray, 'dead');

  var chart = new Chart(ctx, {
      // The type of chart we want to create
      type: 'line',
  
      // The data for our dataset
      data: {
          labels: dateArray,
          datasets: [
            {
              label: 'Potential indirect infections.',
              borderColor: 'rgb(255, 99, 132)',
              data: indirectInfectionData
            },
            {
              label: 'Potential indirect deaths.',
              borderColor: 'rgb(0, 0, 0)',
              data: indirectDeathData
            }
          ]
      },  
      options: {
        hover: {
          filter: {
              type: 'none',
          }
      },
        scales: {
          yAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Number of Infected Individuals'
            }
          }],
          xAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Time (in weeks)'
            }
          }]
        }
      }
  });
}

function getIndirectEstimateData(startDate, endDate, CONTACTS_PER_DAY, INFECTION_RATE, UPPER_CONTAGIOUS_PERIOD, LOWER_CONTAGIOUS_PERIOD)
{
  var dataArray = new Array();
  var infectedPeople = new Array();
  var daysToLoop = Math.round((endDate-startDate)/(1000*60*60*24));

  //we need to first start with one infected individual (the user).
  var patient_0 = 
  {
      incubationPeriod: 0,
      contageousPeriod: getRandomNumberBetweenTwoNumbers(LOWER_CONTAGIOUS_PERIOD, UPPER_CONTAGIOUS_PERIOD),
      severity: RollDieSeverity(),
      daysInfected: 1
  };
  infectedPeople.push(patient_0);

  //for every day, we need to loop through calculate every individual that may be infecting others
  for(i = 0; i < daysToLoop; i++)
  {    
    var dailyInfected = 0;
    var dailyDeathCount = 0;
    var dailyGeneralCount = 0;
    var dailySevereCount = 0;
    var dailyCriticalCount = 0;
    var currentDate = addDays(startDate, i);
    var deadIndeciesToRemove = new Array();
    var infectedToAdd = new Array();

    //for each infected person
    for(n = 0; n < infectedPeople.length; n ++) 
    {
      var person = infectedPeople[n];
      //if they are showing signs of sickness, check the other people they have come in contact with
      if(person.daysInfected > person.incubationPeriod && person.daysInfected < (person.incubationPeriod + person.contageousPeriod))
      {
        for(j = 0; j < CONTACTS_PER_DAY; j ++)
        {
          //we have infected a new individual
          if(RollDieInfection(INFECTION_RATE))
          {
              dailyInfected ++;
              var patient = 
              {
                incubationPeriod: getRandomNumberBetweenTwoNumbers(2,15),
                contageousPeriod: getRandomNumberBetweenTwoNumbers(LOWER_CONTAGIOUS_PERIOD, UPPER_CONTAGIOUS_PERIOD),
                severity: RollDieSeverity(),
                daysInfected: 1
              };
              infectedToAdd.push(patient);

              //count specific cases
              switch (patient.severity)
              {
                  case 'general':
                    dailyGeneralCount ++;
                    break;
                  case 'severe':
                    dailySevereCount ++;
                    break;
                  case 'critical':
                    dailyCriticalCount ++;
                    break;
              }              
          }
        }

        //determine if the individual dies
        if(RollDieToDie(person.severity, person.daysInfected))
        {
            deadIndeciesToRemove.push(n);
            dailyDeathCount ++;
        }
      }
      person.daysInfected ++;
    }
      //remove all dead people
      for(k = 0; k < deadIndeciesToRemove.length; k++)
      {
          infectedPeople.splice(deadIndeciesToRemove[k], 1);
      }
      //add all the new infected people to our array
      for(m = 0; m < infectedToAdd.length; m ++)
      {
          infectedPeople.push(infectedToAdd[m]);
      }

      var dict = {};
      dict["date"] = currentDate;
      dict["infected"] = dailyInfected;
      dict["general"] = dailyGeneralCount;
      dict["severe"] = dailySevereCount;
      dict["critical"] = dailyCriticalCount;
      dict["dead"] = dailyDeathCount;
      dataArray.push(dict);
  }
  return dataArray;
}

function GenerateIndirectInfectionDataFromArray(dataArray, type)
{
   var cascadingData = new Array();
   var currentDataCount = 0;

   for(i = 0; i < dataArray.length; i++)
   {
      var dict = dataArray[i];
      var date = dict["date"];
      if(type == 'infected')
      {
        var dailyData = dict["infected"];
      }
      if(type == 'dead')
      {
        var dailyData = dict["dead"];
      }
           
      currentDataCount += dailyData;

      if(i % 7 == 0)
      {
        cascadingData.push(currentDataCount);        
      }
   }
   return cascadingData;
}

function GenerateIndirectDateArray(earliestDate, latestDate)
{
  dateArray = new Array();
  var amountOfDays = Math.round((latestDate-earliestDate)/(1000*60*60*24));
  for(i = 0; i < amountOfDays; i++)
  {
      var date = addDays(earliestDate, i);
      if(i % 7 == 0)
      {
        dateArray.push(((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear());
      }
  }
  return dateArray;
}

/*************************** End Indirect Calculations ********************/

/************************** Direct Calculations ****************************/

function FillDirectInfectionsTable(dataArray)
{
    var table = document.getElementById("DirectInfectionTable");
    var totalInfectedCount = 0;

    //first clear the table
    table.innerHTML = "";

    //add headers back
    var header = table.createTHead();
    var headerRow = header.insertRow(0);
    var headerCellDate = headerRow.insertCell(0);
    headerCellDate.innerHTML = "Date";
    var headerCellCount = headerRow.insertCell(1);
    headerCellCount.innerHTML = "Total Direct Infections Avoided";
    
    for(i = 0; i < dataArray.length; i++)
   {
      var dict = dataArray[i];
      var date = dict["date"];
      var dailyInfected = dict["infected"];
      totalInfectedCount += dailyInfected;

      if(i % 7 == 0){
        var row = table.insertRow(-1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        cell1.innerHTML = date.toDateString();
        cell2.innerHTML = totalInfectedCount;
      }
   }
}

function DrawDirectInfectionsGraph(RealEstimateArray, EarlyEstimateArray, LateEstimateArray, earlierStartedDate, dateEnded, originalStartDate, laterStartDate)
{
  //find container and clear it of any previous graphs
  var divContainer = document.getElementById('directInfectionsLineGraph');
  divContainer.innerHTML = "";
  //create new canvas to put graph on
  var canvas = document.createElement("canvas");
  canvas.style = "display: inline-block; width: 500px;";
  divContainer.appendChild(canvas);
  //generate graph on canvas
  var ctx = canvas.getContext('2d');

  var dateArray = GenerateDirectDateArray(earlierStartedDate, dateEnded);
  var nowData = GenerateDirectDataFromArray(RealEstimateArray, earlierStartedDate);
  var earlyData = GenerateDirectDataFromArray(EarlyEstimateArray, earlierStartedDate);
  var lateData = GenerateDirectDataFromArray(LateEstimateArray, earlierStartedDate);

  var chart = new Chart(ctx, {
      // The type of chart we want to create
      type: 'line',
  
      // The data for our dataset
      data: {
          labels: dateArray,
          datasets: [
            {
              label: 'Potential direct infections if you left quarantine ' + earlierStartedDate.toDateString() + '.',
              borderColor: 'rgb(64, 127, 255)',
              data: earlyData
            },
            {
              label: 'Potential direct infections if you left quarantine on the date you selected above (' + originalStartDate.toDateString() + ').',
              borderColor: 'rgb(255, 99, 132)',
              data: nowData
            },
            {
              label: 'Potential direct infections if you left quarantine ' + laterStartDate.toDateString() + '.',
              borderColor: 'rgb(101, 255, 162)',
              data: lateData
            }
          ]
      },  
      // Configuration options go here
      options: {
        hover: {
          filter: {
              type: 'none',
          }
      },
        scales: {
          yAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Number of Infected Individuals'
            }
          }],
          xAxes: [{
            scaleLabel: {
                display: true,
                labelString: 'Time (in days)'
            }
          }]
        }
      }
  });
}

function GenerateDirectDataFromArray(dataArray, firstDate)
{
   var cascadingInfections = new Array();
   var currentInfectionCount = 0;

   for(i = 0; i < dataArray.length; i++)
   {
      var dict = dataArray[i];
      var date = dict["date"];
      var dailyInfected = dict["infected"];

      if(i == 0)
      {
        if(date != firstDate)
        {
            var dateDifference = Math.round((date-firstDate)/(1000*60*60*24));
            for(j = 0; j < dateDifference; j++)
            {
                cascadingInfections.push(0);
            }
        }
      }

      currentInfectionCount += dailyInfected;
      cascadingInfections.push(currentInfectionCount);     
        
   }

   return cascadingInfections;
}

function GenerateDirectDateArray(earliestDate, latestDate)
{
  dateArray = new Array();
  var amountOfDays = Math.round((latestDate-earliestDate)/(1000*60*60*24));
  for(i = 0; i < amountOfDays; i++)
  {
      var date = addDays(earliestDate, i);
      dateArray.push(((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear());
  }
  return dateArray;
}

function getDirectEstimateDataBetweenTwoDates(startDate, endDate, contactsPerDay, INFECTION_RATE, UPPER_CONTAGIOUS_PERIOD)
{
  var dataArray = new Array();
  var daysToLoop = Math.round((endDate-startDate)/(1000*60*60*24));

  for(i = 0; i < daysToLoop; i++)
  {    
    var dailyInfected = 0;
    var currentDate = addDays(startDate, i);

      if(i < UPPER_CONTAGIOUS_PERIOD)
      {
        for(j = 0; j < contactsPerDay; j ++)
        { 
          if(RollDieInfection(INFECTION_RATE))
          {
              dailyInfected ++;
          }
      }
    }

      var dict = {};
      dict["date"] = currentDate;
      dict["infected"] = dailyInfected;
      dataArray.push(dict);
  }
  return dataArray;
}

/*************************** End Direct Calculations ********************/

/*************************** General Methods ******************************/

function WriteCongratulationMessage(totalInfected, dateStarted)
{
    var p = document.getElementById("congratsMessage");
    p.innerHTML = "You are saving lives and making a difference by staying indoors and away from people! If you were to leave quarantine on " + dateStarted.toDateString() + " you could potentially infect " + totalInfected.toLocaleString() + " people over the course of 2 months! You should take pride in knowing you are doing so much by staying home. Take a look at the information below to see how that number was calculated.";
}

function addMonths(date, months)
{
  var result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date, days)
{
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getRandomNumberBetweenTwoNumbers(min, max)
{
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function RollDieInfection(INFECTION_RATE)
{
    var result = 1+ Math.floor(Math.random()*100);
    if(result <= INFECTION_RATE)
    {
       return true;
    }
    else
    {
      return false;
    }
}

function RollDieSeverity()
{
  var result = 1+ Math.floor(Math.random()*100);
  if(result <= 38)
  {
    return 'general';
  }
  if(result > 38 && result <= 73){
    return 'severe';
  }
  if(result > 73)
  {
    return 'critical';
  }
}

function RollDieToDie(severity, daysInfected)
{
  if(daysInfected > getRandomNumberBetweenTwoNumbers(6, 20))
  {
    var result = 1+ Math.floor(Math.random()*100);
    if(severity == 'severe' && result <= 22)
    {
      return true;
    }
    else if(severity == 'critical' && result <= 78)
    {
      return true;
    }
    else
    {
      return false;
    }
  }
}

/*************************** End General Methods ********************/