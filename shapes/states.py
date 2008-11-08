#!/usr/bin/env python

array = [
	{
		'abbr': 'AL',
		'name': 'Alabama',
	},
	{
		'abbr': 'AK',
		'name': 'Alaska',
	},
	{
		'abbr': 'AZ',
		'name': 'Arizona',
	},
	{
		'abbr': 'AR',
		'name': 'Arkansas',
	},
	{
		'abbr': 'CA',
		'name': 'California',
	},
	{
		'abbr': 'CO',
		'name': 'Colorado',
	},
	{
		'abbr': 'CT',
		'name': 'Connecticut',
		'votesby': 'town',
	},
	{
		'abbr': 'DE',
		'name': 'Delaware',
	},
	{
		'abbr': 'DC',
		'name': 'District of Columbia',
	},
	{
		'abbr': 'FL',
		'name': 'Florida',
	},
	{
		'abbr': 'GA',
		'name': 'Georgia',
	},
	{
		'abbr': 'HI',
		'name': 'Hawaii',
	},
	{
		'abbr': 'ID',
		'name': 'Idaho',
	},
	{
		'abbr': 'IL',
		'name': 'Illinois',
	},
	{
		'abbr': 'IN',
		'name': 'Indiana',
	},
	{
		'abbr': 'IA',
		'name': 'Iowa',
	},
	{
		'abbr': 'KS',
		'name': 'Kansas',
		'votesby': 'district',
	},
	{
		'abbr': 'KY',
		'name': 'Kentucky',
	},
	{
		'abbr': 'LA',
		'name': 'Louisiana',
	},
	{
		'abbr': 'ME',
		'name': 'Maine',
	},
	{
		'abbr': 'MD',
		'name': 'Maryland',
	},
	{
		'abbr': 'MA',
		'name': 'Massachusetts',
		'votesby': 'town',
	},
	{
		'abbr': 'MI',
		'name': 'Michigan',
	},
	{
		'abbr': 'MN',
		'name': 'Minnesota',
	},
	{
		'abbr': 'MS',
		'name': 'Mississippi',
	},
	{
		'abbr': 'MO',
		'name': 'Missouri',
	},
	{
		'abbr': 'MT',
		'name': 'Montana',
	},
	{
		'abbr': 'NE',
		'name': 'Nebraska',
	},
	{
		'abbr': 'NV',
		'name': 'Nevada',
	},
	{
		'abbr': 'NH',
		'name': 'New Hampshire',
		'votesby': 'town',
	},
	{
		'abbr': 'NJ',
		'name': 'New Jersey',
	},
	{
		'abbr': 'NM',
		'name': 'New Mexico',
	},
	{
		'abbr': 'NY',
		'name': 'New York',
	},
	{
		'abbr': 'NC',
		'name': 'North Carolina',
	},
	{
		'abbr': 'ND',
		'name': 'North Dakota',
	},
	{
		'abbr': 'OH',
		'name': 'Ohio',
	},
	{
		'abbr': 'OK',
		'name': 'Oklahoma',
	},
	{
		'abbr': 'OR',
		'name': 'Oregon',
	},
	{
		'abbr': 'PA',
		'name': 'Pennsylvania',
	},
	{
		'abbr': 'PR',
		'name': 'Puerto Rico',
	},
	{
		'abbr': 'RI',
		'name': 'Rhode Island',
	},
	{
		'abbr': 'SC',
		'name': 'South Carolina',
	},
	{
		'abbr': 'SD',
		'name': 'South Dakota',
	},
	{
		'abbr': 'TN',
		'name': 'Tennessee',
	},
	{
		'abbr': 'TX',
		'name': 'Texas',
	},
	{
		'abbr': 'UT',
		'name': 'Utah',
	},
	{
		'abbr': 'VT',
		'name': 'Vermont',
		'votesby': 'town',
	},
	{
		'abbr': 'VA',
		'name': 'Virginia',
	},
	{
		'abbr': 'WA',
		'name': 'Washington',
	},
	{
		'abbr': 'WV',
		'name': 'West Virginia',
	},
	{
		'abbr': 'WI',
		'name': 'Wisconsin',
	},
	{
		'abbr': 'WY',
		'name': 'Wyoming',
	}
]

byAbbr = {}
for state in array:
	byAbbr[ state['abbr'] ] = state

byName = {}
for state in array:
	byName[ state['name'] ] = state
