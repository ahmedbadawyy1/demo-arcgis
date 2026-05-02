Dashboard Widget Configuration Sheet (Copy/Paste)
Use this directly while building your ArcGIS Dashboard.

Global Dashboard Settings
Data source: test1111
Refresh interval: 1 minute
Default filter: none
Sort default (tables/lists): riskScore DESC
Number format: 1 decimal for weather; 0 decimals for counts
Color standard:
Low = #2E7D32 (green)
Medium = #F9A825 (amber)
High = #C62828 (red)
1) Top KPI Row (4 Indicators)
Widget 1
Title: Highest Risk Score
Type: Indicator
Field: riskScore
Statistic: MAX
Format: 0.0
Thresholds:
0-34 green
35-69 amber
70-100 red
Widget 2
Title: Average Temperature (°C)
Type: Indicator
Field: tempC
Statistic: AVG
Format: 0.0
Thresholds:
<30 green
30-39 amber
=40 red

Widget 3
Title: Max Wind Gust (km/h)
Type: Indicator
Field: windGustKmh
Statistic: MAX
Format: 0.0
Thresholds:
<25 green
25-40 amber
40 red

Widget 4
Title: Total Social Volume
Type: Indicator
Field: socialCount
Statistic: SUM
Format: 0
Thresholds:
<100 green
100-250 amber
250 red

2) Map Panel (Main)
Widget 5
Title: Live Emirates Situation
Type: Map
Source map: UAE Live Risk Map
Symbology field: riskScore (graduated color)
Color ramp: green -> yellow -> red
Value range: 0 to 100
Point size field: rainMm (or windGustKmh)
Popup fields:
name, riskScore, riskBand
tempC, feelsLikeC, humidityPct, visibilityM
rainMm, forecastRain24h, windGustMax24h
socialCount, socialTopKeyword, updatedAt
3) Operational Weather Board (Right Panel)
Widget 6
Title: Current Temp (°C)
Type: Indicator
Field: tempC
Statistic: AVG (or Feature value when selected)
Format: 0.0
Widget 7
Title: Feels Like (°C)
Type: Indicator
Field: feelsLikeC
Statistic: AVG
Format: 0.0
Widget 8
Title: Humidity (%)
Type: Gauge
Field: humidityPct
Statistic: AVG
Range: 0-100
Bands:
0-40 dry (amber)
40-70 comfort (green)
70-100 humid (amber/red)
Widget 9
Title: Pressure (hPa)
Type: Indicator
Field: pressureHpa
Statistic: AVG
Format: 0.0
Widget 10
Title: Visibility (m)
Type: Indicator
Field: visibilityM
Statistic: MIN
Format: 0
Thresholds:
=5000 green

3000-4999 amber
<3000 red
Widget 11
Title: Wind / Gust (km/h)
Type: Details (or two indicators)
Field A: windKmh (AVG)
Field B: windGustKmh (MAX)
Format: 0.0
4) 24h Forecast Panel (Bottom Left)
Widget 12
Title: Forecast Max Temp 24h (°C)
Type: Indicator
Field: forecastTempMax24h
Statistic: MAX
Format: 0.0
Widget 13
Title: Forecast Rain 24h (mm)
Type: Gauge
Field: forecastRain24h
Statistic: MAX
Range: 0-50
Bands:
0-5 green
5-10 amber
10 red

Widget 14
Title: Forecast Max Gust 24h (km/h)
Type: Indicator
Field: windGustMax24h
Statistic: MAX
Format: 0.0
Thresholds:
<30 green
30-45 amber
45 red

5) Social Awareness Panel (Bottom Middle)
Widget 15
Title: Social Engagement
Type: Indicator
Field: socialEngagement
Statistic: SUM
Format: 0
Widget 16
Title: Top Keyword
Type: List
Display field: socialTopKeyword
Sort: socialCount DESC
Max items: 7
Widget 17
Title: Top Subreddit
Type: List
Display field: socialTopSubreddit
Sort: socialEngagement DESC
Max items: 7
6) Risk Intelligence Panel (Bottom Right)
Widget 18
Title: Current Risk Band
Type: Indicator
Field: riskBand
Statistic: MODE (or selected feature value)
Conditional color:
low green
medium amber
high red
Widget 19
Title: High Risk Alerts
Type: List
Filter: riskBand = 'high'
Display: name, riskScore, forecastRain24h, windGustMax24h
Widget 20
Title: Emirates Risk Ranking
Type: Table
Columns:
name
riskScore
riskBand
forecastRain24h
windGustMax24h
updatedAt
Sort: riskScore DESC
7) Selectors (Top/Side)
Selector A
Title: Filter by Risk Band
Type: Category selector
Field: riskBand
Affects: map + all widgets
Selector B
Title: Filter by Emirate
Type: Category selector
Field: name
Affects: map + all widgets
8) Dashboard Actions (Must Configure)
Map selection -> filters all indicators, lists, and table
Table row selection -> zooms map to selected emirate
Selectors -> filter all widgets
Reset button: clear selection/filter
9) Last Update Widget
Widget 21
Title: Last Data Update
Type: Indicator
Field: updatedAt
Statistic: MAX
Format: DateTime




can show you how to temporarily lower risk thresholds in .env so some emirates become medium/high for presentation.





[{"id":"1t0uufr","title":"R u Keeping yur tongue moist with zikr","subreddit":"islam","score":90,"comments":5,"createdUtc":1777645326,"permalink":"https://www.reddit.com/r/islam/comments/1t0uufr/r_u_keeping_yur_tongue_moist_with_zikr/","keyword":"rain Dubai Abu Dhabi"},{"id":"1t0zau0","title":"[WTS] HAPPY FRIDAY / HAPPY MAY / HOW IS IT ALREADY MAY SALE + GIVEAWAY — 25% OFF ALMOST EVERYTHING + NEW ADDITIONS + I MET THE MIND GAMES CEO SO NOW I’M BASICALLY IMPORTANT (Decant)","subreddit":"fragranceswap","score":10,"comments":16,"createdUtc":1777654999,"permalink":"https://www.reddit.com/r/fragranceswap/comments/1t0zau0/wts_happy_friday_happy_may_how_is_it_already_may/","keyword":"flood UAE Abu Dhabi"},{"id":"1t0zzdy","title":"28M | Bengali | Looking for a partner whom I can eventually call Life Partner","subreddit":"JodiMilan","score":1,"comments":19,"createdUtc":1777656461,"permalink":"https://www.reddit.com/r/JodiMilan/comments/1t0zzdy/28m_bengali_looking_for_a_partner_whom_i_can/","keyword":"flood UAE Abu Dhabi"},{"id":"1t0t3kr","title":"Why don’t they just cross Iran’s name off the map then sail the boats past it, are they idiots?","subreddit":"mapporncirclejerk","score":16,"comments":4,"createdUtc":1777641228,"permalink":"https://www.reddit.com/r/mapporncirclejerk/comments/1t0t3kr/why_dont_they_just_cross_irans_name_off_the_map/","keyword":"flood UAE Abu Dhabi"},{"id":"1t0sldz","title":"In Abu-dhabi right now but Lodha me sutta marne jesa maja nhi a rha hai😂😂😂","subreddit":"kalyan_dombivli","score":0,"comments":16,"createdUtc":1777639985,"permalink":"https://www.reddit.com/r/kalyan_dombivli/comments/1t0sldz/in_abudhabi_right_now_but_lodha_me_sutta_marne/","keyword":"flood UAE Abu Dhabi"}]