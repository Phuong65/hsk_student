import { Component } from '@angular/core';
import { ApexAxisChartSeries , ApexChart , ApexDataLabels , ApexGrid , ApexLegend , ApexNonAxisChartSeries , ApexPlotOptions , ApexTooltip , ApexXAxis , ApexYAxis , ChartComponent } from "ng-apexcharts";

@Component( {
	selector    : 'app-sample-dashboard' ,
	imports     : [ ChartComponent ] ,
	templateUrl : './sample-dashboard.component.html' ,
	styleUrl    : './sample-dashboard.component.css'
} )
export class SampleDashboardComponent {
	series : ApexAxisChartSeries | ApexNonAxisChartSeries = [
		{
			name : "2024" ,
			data : [ 3.3 , 3.6 , 2 , 1.4 , 1.2 , 1.8 , 1.1 , 1.4 , 1.5 , 1.3 , 3.6 , 2 ]
		} ,
		{
			name : "2023" ,
			data : [ -2.6 , -2.1 , -3.5 , -2.5 , -1.3 , -1.8 , -2 , -1.1 , -1.4 , -2.1 , -3.5 , -2.5 ]
		}
	];
	chart : ApexChart                                     = {
		toolbar    : {
			show : false
		} ,
		type       : "bar" ,
		fontFamily : "inherit" ,
		foreColor  : "#adb0bb" ,
		height     : 300 ,
		stacked    : true ,
		offsetX    : -15
	};
	colors : string[]                                     = [ "#0074FF" , "#01bd9b" ];
	plotOptions : ApexPlotOptions                         = {
		bar : {
			horizontal              : false ,
			barHeight               : "80%" ,
			columnWidth             : "15%" ,
			borderRadius            : 6 ,
			borderRadiusApplication : "end" ,
			borderRadiusWhenStacked : "all"
		}
	};
	dataLabels : ApexDataLabels                           = {
		enabled : false
	};
	legend : ApexLegend                                   = {
		show : false
	};
	grid : ApexGrid                                       = {
		show        : true ,
		padding     : {
			top    : 0 ,
			bottom : 0 ,
			right  : 0
		} ,
		borderColor : "rgba(0,0,0,0.05)" ,
		xaxis       : {
			lines : {
				show : true
			}
		} ,
		yaxis       : {
			lines : {
				show : true
			}
		}
	};
	yaxis : ApexYAxis | ApexYAxis[]                       = {
		min        : -5 ,
		max        : 5 ,
		tickAmount : 4
	};
	xaxis : ApexXAxis                                     = {
		axisBorder : {
			show : false
		} ,
		axisTicks  : {
			show : false
		} ,
		categories : [
			"Jan" ,
			"Feb" ,
			"Mar" ,
			"Apr" ,
			"May" ,
			"Jun" ,
			"July" ,
			"Aug" ,
			"Sep" ,
			"Oct" ,
			"Nov" ,
			"Dec"
		] ,
		labels     : {
			style : { fontSize : "13px" , colors : "#adb0bb" , fontWeight : "400" }
		}
	};
	tooltip : ApexTooltip                                 = {
		theme : "dark"
	};
}
