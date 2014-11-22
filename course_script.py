from uwaterlooapi import UWaterlooAPI
import json
import time

key = "7169a9c78a8a6c0f2885854562b114c4"

def get_subject(subjects):
    while True:
        try:
            return uw.courses(subjects)
        except:
            print("Requesting subject {} info failed. Reconnecting...".format(subject, catalog_number))
            time.sleep(0.5)

def get_course_info(subject, catalog_number):
    while True:
        try:
            return uw.course(subject, catalog_number)
        except:
            print("Requesting {} {} info failed. Reconnecting...".format(subject, catalog_number))
            time.sleep(0.5)

if __name__ == "__main__":
    uw = UWaterlooAPI(api_key=key)
    subjects = uw.subject_codes()
    print("Number of subjects: {}".format(len(subjects)))
    i   = 0
    data = []
    for subject_reponse in subjects:
        subject = subject_reponse["subject"]
        catalog_list = get_subject(subject)
        print("Number of course catalog ids for subject {} is: {}".format(subject, len(catalog_list)))
        for item in catalog_list:
            catalog_number = item["catalog_number"]
            course_info = get_course_info(subject, catalog_number)
            name = subject + " " + catalog_number
            course_info["name"] = name

            print("Course name: {}".format(name))
            data.append(course_info)
    with open('data.js', 'w') as outfile:
        json.dump(data, outfile)

    course_info_dict = {}
    for item in data:
        course_info_dict[item.name] = item

    with open('course_dict.js', 'w') as outfile:
        json.dump(data, outfile)
